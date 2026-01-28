// src/formGenerator.js
// Generator: transforma reglas/config en un esquema de formulario procesable.

import { normalizeRules } from "./rules.js";

/**
 * Backwards compatible: genera HTML desde un schema en formato objeto
 * {
 *   email: { required: true, type: 'email', label: 'Tu Correo' }
 * }
 *
 * OJO: este helper queda, pero el camino "pro" es usar FormGenerator.generate(...)
 */
export const generateFormHTML = (schema, options = {}) => {
  // Fallback legacy (si alguien lo usaba directo)
  // Nota: delegamos al HtmlAdapter si lo querés pro; acá mantenemos simple.
  const {
    action = "#",
    method = "POST",
    submitText = "Enviar",
    className = "unival-form",
    formId = "unival-generated-form",
  } = options;

  let fieldsHTML = "";

  for (const fieldName in schema) {
    const r = normalizeRules(schema[fieldName]);
    const type = r.type || "text";
    const label = r.label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    // attrs mínimos legacy (sin htmlAdapter acá)
    const attrs = [];
    attrs.push(`type="${type}"`);
    attrs.push(`name="${fieldName}"`);
    attrs.push(`id="${fieldName}"`);
    if (r.required) attrs.push("required");
    if (r.min != null) attrs.push(`minlength="${r.min}"`);
    if (r.max != null) attrs.push(`maxlength="${r.max}"`);

    fieldsHTML += `
      <div class="field-group">
        <label for="${fieldName}">${label}</label>
        <input ${attrs.join(" ")}>
        <span class="error-msg" id="error-${fieldName}"></span>
      </div>
    `;
  }

  return `
    <form action="${action}" method="${method}" class="${className}" id="${formId}">
      ${fieldsHTML}
      <button type="submit">${submitText}</button>
    </form>
  `;
};

/**
 * API nueva (alineada al README):
 *
 * const html = FormGenerator.generate(config, HtmlAdapter, options)
 */
export class FormGenerator {
  static generate(config = [], adapter, options = {}) {
    if (!Array.isArray(config)) {
      throw new TypeError("FormGenerator.generate(config): config debe ser un array");
    }
    if (!adapter) {
      throw new TypeError("FormGenerator.generate(config, adapter): adapter es requerido");
    }

    // PRO: definimos defaults de opciones
    const nextOptions = {
      ...options,
      form: {
        id: options?.form?.id || "unival-generated-form", // compat por defecto
        action: options?.form?.action ?? options?.action ?? "#",
        method: options?.form?.method ?? options?.method ?? "POST",
        className: options?.form?.className ?? options?.className ?? "unival-form",
        attrs: options?.form?.attrs || {}, // attrs extra (data-*, autocomplete, etc.)
      },
      submit: {
        text: options?.submit?.text || options?.submitText || "Enviar",
        className: options?.submit?.className || "",
        attrs: options?.submit?.attrs || {},
      },
      classes: {
        // clases default (podés overridearlas desde options)
        fieldGroup: options?.classes?.fieldGroup ?? "field-group",
        label: options?.classes?.label ?? "",
        input: options?.classes?.input ?? "",
        error: options?.classes?.error ?? "error-msg",
        hint: options?.classes?.hint ?? "hint",
      },
    };

    // Normalizamos a un schema objeto:
    // { [name]: { name, type, label, placeholder, rules..., ui... } }
    const schema = {};

    for (const item of config) {
      if (!item || typeof item !== "object") continue;

      // submit
      if (item.type === "submit") {
        nextOptions.submit.text = item.value || nextOptions.submit.text;
        // permitimos que config submit agregue clase/attrs
        if (item.className) nextOptions.submit.className = item.className;
        if (item.attrs && typeof item.attrs === "object") {
          nextOptions.submit.attrs = { ...nextOptions.submit.attrs, ...item.attrs };
        }
        continue;
      }

      if (!item.name) continue;

      // Permitimos rules string ("required|email|min:8") y rules objeto.
      const normalizedRules = item.rules ? normalizeRules(item.rules) : {};

      schema[item.name] = {
        ...item,
        ...normalizedRules,
        // Aseguramos que ui exista si el usuario la pasa
        ui: item.ui && typeof item.ui === "object" ? item.ui : undefined,
      };
    }

    // Si el adapter provee un renderForm, delegamos ahí.
    if (typeof adapter.renderForm === "function") {
      return adapter.renderForm(schema, nextOptions);
    }

    // Fallback: legacy HTML simple
    return generateFormHTML(schema, {
      action: nextOptions.form.action,
      method: nextOptions.form.method,
      submitText: nextOptions.submit.text,
      className: nextOptions.form.className,
      formId: nextOptions.form.id,
    });
  }
}
