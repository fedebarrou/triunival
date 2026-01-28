// src/htmlAdapter.js

import { normalizeRules } from "./rules.js";

/**
 * Transforma reglas de validación a atributos HTML5 (UX, no seguridad).
 */
export const toHtmlAttributes = (rules) => {
  const r = normalizeRules(rules);
  const attrs = {};

  // Mapeo de tipos
  if (r.type) {
    const typeMap = {
      email: "email",
      password: "password",
      number: "number",
      url: "url",
      date: "date",
      text: "text",
    };
    attrs.type = typeMap[r.type] || "text";
  }

  // Restricciones de presencia y longitud
  if (r.required) attrs.required = true;
  if (r.min != null) attrs.minLength = r.min;
  if (r.max != null) attrs.maxLength = r.max;

  // Restricciones numéricas
  if (r.minValue !== undefined) attrs.min = r.minValue;
  if (r.maxValue !== undefined) attrs.max = r.maxValue;

  // pattern
  if (r.pattern) {
    attrs.pattern = r.pattern instanceof RegExp ? r.pattern.source : r.pattern;
  }

  return attrs;
};

/**
 * HtmlAdapter (PRO):
 * - respeta options.form, options.submit, options.classes
 * - soporta item.ui por campo
 * - soporta escape hatch: ui.render(field, ctx) => string
 *
 * Compatibilidad:
 * - Siempre imprime class "error-msg" en el span de error (legacy)
 * - También imprime data-error-for="field" (nuevo)
 */
export class HtmlAdapter {
  static renderForm(schema, options = {}) {
    const form = options?.form || {};
    const submit = options?.submit || {};
    const classes = options?.classes || {};

    const formId = form.id || "unival-generated-form"; // compat default
    const action = form.action ?? "#";
    const method = (form.method ?? "POST").toUpperCase();
    const formClass = form.className ?? "unival-form";
    const formAttrs = objectToHtmlAttrs(form.attrs || {});

    let fieldsHTML = "";

    // schema es un objeto: { [name]: fieldDef }
    for (const fieldName in schema) {
      const field = schema[fieldName] || {};
      fieldsHTML += this.renderField(fieldName, field, options);
    }

    const submitHTML = this.renderSubmit(options);

    return `
      <form id="${escapeHtml(formId)}"
            action="${escapeHtml(action)}"
            method="${escapeHtml(method)}"
            class="${escapeHtml(formClass)}"
            ${formAttrs}>
        ${fieldsHTML}
        ${submitHTML}
      </form>
    `;
  }

  static renderField(fieldName, field, options = {}) {
    const classes = options?.classes || {};
    const r = normalizeRules(field);

    // Escape hatch por campo (UX total sin adapter nuevo)
    // ui.render(field, ctx) => string
    if (field?.ui?.render && typeof field.ui.render === "function") {
      return String(
        field.ui.render(
          { name: fieldName, ...field, ...r },
          {
            options,
            toHtmlAttributes,
            objectToHtmlAttrs,
            escapeHtml,
          }
        ) ?? ""
      );
    }

    const label = field.label || r.label || prettifyName(fieldName);

    // clases: options + overrides por campo
    const groupClass = cx(classes.fieldGroup, field.ui?.wrapperClass, field.className);
    const labelClass = cx(classes.label, field.ui?.labelClass);
    const inputClass = cx(classes.input, field.ui?.inputClass);
    const hintClass = cx(classes.hint, field.ui?.hintClass);

    // 👇 clave: base class estable + custom
    const errorClass = cx("error-msg", classes.error, field.ui?.errorClass);

    // attrs HTML base desde rules
    const attrsObj = {
      ...toHtmlAttributes(r),
      id: field.id || fieldName,
      name: fieldName,
      placeholder: field.placeholder || "",
      ...(field.attrs && typeof field.attrs === "object" ? field.attrs : {}),
    };

    // Precedencia de type: config.type > rules.type
    if (field.type) attrsObj.type = field.type;

    const variant = field.ui?.variant || "default";

    // Permitir distintos controles a futuro (sin romper API)
    const controlTag = (field.ui?.control || field.control || "input").toLowerCase();
    const controlHTML = renderControl(controlTag, attrsObj, inputClass);

    if (variant === "floating") {
      return `
        <div class="${escapeHtml(groupClass)}" data-variant="floating">
          <div class="floating-wrap">
            ${controlHTML}
            <label class="${escapeHtml(labelClass)}" for="${escapeHtml(attrsObj.id)}">${escapeHtml(
        label
      )}</label>
          </div>
          ${this.renderHint(field, hintClass)}
          <span class="${escapeHtml(errorClass)}" data-error-for="${escapeHtml(fieldName)}"></span>
        </div>
      `;
    }

    return `
      <div class="${escapeHtml(groupClass)}">
        ${label
        ? `<label class="${escapeHtml(labelClass)}" for="${escapeHtml(attrsObj.id)}">${escapeHtml(
          label
        )}</label>`
        : ""
      }
        ${controlHTML}
        ${this.renderHint(field, hintClass)}
        <span class="${escapeHtml(errorClass)}" data-error-for="${escapeHtml(fieldName)}"></span>
      </div>
    `;
  }

  static renderHint(field, hintClass) {
    const hint = field?.ui?.hint || field?.hint;
    if (!hint) return "";
    return `<div class="${escapeHtml(hintClass || "hint")}">${escapeHtml(String(hint))}</div>`;
  }

  static renderSubmit(options = {}) {
    const submit = options?.submit || {};
    const text = submit.text || "Enviar";
    const className = submit.className || "";
    const attrs = objectToHtmlAttrs(submit.attrs || {});
    return `<button type="submit" class="${escapeHtml(className)}" ${attrs}>${escapeHtml(
      text
    )}</button>`;
  }
}

// ---------------------------
// helpers
// ---------------------------

function renderControl(tag, attrsObj, inputClass) {
  const attrs = objectToHtmlAttrs(attrsObj);
  const cls = inputClass ? `class="${escapeHtml(inputClass)}"` : "";

  if (tag === "textarea") {
    // placeholder va como atributo, value no
    return `<textarea ${cls} ${attrs}></textarea>`;
  }

  if (tag === "select") {
    // Si querés options en el futuro: field.ui.options, etc.
    // Acá dejándolo neutro (sin options) para no inventar contrato.
    return `<select ${cls} ${attrs}></select>`;
  }

  // default: input
  return `<input ${cls} ${attrs} />`;
}

function objectToHtmlAttrs(attrs) {
  return Object.entries(attrs)
    .map(([key, value]) => {
      if (value === true) return escapeHtml(key);
      if (value === undefined || value === false || value === null) return "";
      return `${escapeHtml(key)}="${escapeHtml(String(value))}"`;
    })
    .filter(Boolean)
    .join(" ");
}

function prettifyName(name) {
  return String(name)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function cx(...parts) {
  return parts
    .flat()
    .filter(Boolean)
    .map((x) => String(x).trim())
    .filter(Boolean)
    .join(" ");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
