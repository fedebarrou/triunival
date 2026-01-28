// src/core.js
// Core de validación (usable en backend y frontend)

import { normalizeRules } from "./rules.js";
import { generateFormHTML } from "./formGenerator.js";

/**
 * Valida un objeto `data` contra reglas.
 *
 * `rules` puede ser:
 * - objeto por campo con string rules ("required|email|min:8")
 * - objeto por campo con reglas en formato objeto (backwards compatible)
 *
 * Retorna: { isValid, errors }
 * - errors es un objeto: { [field]: string } (backwards compatible)
 */
export async function validate(data = {}, rules = {}) {
  const errors = {};

  const fields = Object.keys(rules || {});
  const tasks = fields.map(async (field) => {
    const normalized = normalizeRules(rules[field]);
    const value = data?.[field];

    // 1) required
    if (normalized.required && isEmpty(value)) {
      errors[field] = "Obligatorio";
      return;
    }

    // Si está vacío y no es required, no aplicamos el resto
    if (isEmpty(value)) return;

    // 2) tipo/email/url/number
    if (normalized.email && !isEmail(String(value))) {
      errors[field] = "Email inválido";
      return;
    }
    if (normalized.url && !isUrl(String(value))) {
      errors[field] = "URL inválida";
      return;
    }
    if (normalized.number && !isNumeric(String(value))) {
      errors[field] = "Debe ser un número";
      return;
    }

    // 3) min/max length
    if (normalized.min != null && String(value).length < normalized.min) {
      errors[field] = `Mínimo ${normalized.min} caracteres`;
      return;
    }
    if (normalized.max != null && String(value).length > normalized.max) {
      errors[field] = `Máximo ${normalized.max} caracteres`;
      return;
    }

    // 4) min/max value
    if (normalized.minValue != null && isNumeric(String(value)) && Number(value) < normalized.minValue) {
      errors[field] = `Mínimo ${normalized.minValue}`;
      return;
    }
    if (normalized.maxValue != null && isNumeric(String(value)) && Number(value) > normalized.maxValue) {
      errors[field] = `Máximo ${normalized.maxValue}`;
      return;
    }

    // 5) pattern
    if (normalized.pattern) {
      const re =
        normalized.pattern instanceof RegExp
          ? normalized.pattern
          : new RegExp(String(normalized.pattern));
      if (!re.test(String(value))) {
        errors[field] = "Formato inválido";
        return;
      }
    }

    // 6) custom async validate (solo formato objeto)
    if (typeof normalized.validate === "function") {
      const customMsg = await normalized.validate(value, data);
      if (typeof customMsg === "string") errors[field] = customMsg;
      else if (customMsg === false) errors[field] = "Inválido";
    }
  });

  await Promise.all(tasks);
  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * UniVal (backwards compatible)
 *
 * - Mantiene `render()` y `initAutomanage()` para navegador.
 * - Usa el core `validate()`.
 *
 * ✅ Adaptado para:
 * - HTML legacy: <span id="error-campo" class="error-msg">
 * - HTML pro:    <span data-error-for="campo" class="...">
 * - options.form.id (form pro)
 */
export class UniVal {
  constructor(schema) {
    this.schema = schema;
    this.formElement = null;

    // compat default
    this.formId = "unival-generated-form";

    // clase a aplicar a inputs con error (legacy)
    this.inputErrorClass = "unival-input-error";
  }

  /**
   * Render legacy: usa generateFormHTML()
   * Si querés el modo pro (FormGenerator + HtmlAdapter), podés ignorar esto.
   */
  render(options = {}, containerId = null) {
    // soporte: options.form.id (modo pro), options.formId (legacy), fallback default
    const nextFormId =
      options?.form?.id || options?.formId || options?.id || this.formId || "unival-generated-form";
    this.formId = nextFormId;

    const html = generateFormHTML(this.schema, {
      ...options,
      formId: nextFormId,
      // por si alguien usa options.form también acá
      action: options?.form?.action ?? options?.action,
      method: options?.form?.method ?? options?.method,
      className: options?.form?.className ?? options?.className,
      submitText: options?.submit?.text ?? options?.submitText,
    });

    if (containerId && typeof document !== "undefined") {
      const el = document.getElementById(containerId);
      if (el) {
        el.innerHTML = html;
        this.initAutomanage(undefined, undefined, { formId: nextFormId });
      }
    }

    return html;
  }

  /**
   * Automanage:
   * - valida en cliente
   * - si pasa, hace fetch al action del form
   * - pinta errores inline (legacy + pro)
   *
   * Soporta options.formId o options.form.id
   */
  initAutomanage(onSuccess, onError, options = {}) {
    if (typeof document === "undefined") return;

    const nextFormId =
      options?.form?.id || options?.formId || this.formId || "unival-generated-form";
    this.formId = nextFormId;

    const form =
      document.getElementById(nextFormId) ||
      // fallback por si el usuario no pasa id
      document.querySelector("form");

    if (!form) return;

    this.formElement = form;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      this._clearErrors();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const result = await this.validate(data);
      if (!result.isValid) {
        this._showErrors(result.errors);
        if (onError) onError(result.errors);
        return;
      }

      try {
        const response = await fetch(form.action, {
          method: form.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const apiResult = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (apiResult?.errors) this._showErrors(apiResult.errors);
          if (onError) onError(apiResult);
        } else {
          if (onSuccess) onSuccess(apiResult);
        }
      } catch (err) {
        console.error("Error de red o servidor:", err);
        if (onError) onError(err);
      }
    });
  }

  async validate(data) {
    return validate(data, this.schema);
  }

  _showErrors(errors) {
    if (typeof document === "undefined") return;

    for (const field in errors) {
      const msg = errors[field];

      // 1) Legacy: <span id="error-field">
      const legacySpan = document.getElementById(`error-${field}`);

      // 2) Pro: <span data-error-for="field">
      const dataSpan = document.querySelector(`[data-error-for="${cssEscape(field)}"]`);

      const span = legacySpan || dataSpan;
      if (span) span.innerText = msg;

      // input element (id="field" o name="field")
      const input =
        document.getElementById(field) ||
        document.querySelector(`[name="${cssEscape(field)}"]`);

      if (input) input.classList.add(this.inputErrorClass);
    }
  }

  _clearErrors() {
    if (typeof document === "undefined") return;

    // Limpia legacy + pro
    const spans = [
      ...document.querySelectorAll(".error-msg"),
      ...document.querySelectorAll("[data-error-for]"),
    ];

    spans.forEach((s) => (s.innerText = ""));

    // No asumas solo input
    const controls = document.querySelectorAll("input, select, textarea");
    controls.forEach((el) => el.classList.remove(this.inputErrorClass));
  }
}

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isUrl(s) {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function isNumeric(s) {
  if (s.trim() === "") return false;
  return Number.isFinite(Number(s));
}

/**
 * Escape mínimo para usar nombres de campo en querySelector.
 * (CSS.escape no está garantizado en todos los entornos)
 */
function cssEscape(str) {
  return String(str).replace(/["\\]/g, "\\$&");
}
