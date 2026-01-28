// src/formGenerator.js
// Generator: transforma reglas/config en un esquema de formulario procesable.

import { toHtmlAttributes } from './htmlAdapter.js';
import { normalizeRules } from './rules.js';

/**
 * Backwards compatible: genera HTML desde un schema en formato objeto
 * {
 *   email: { required: true, type: 'email', label: 'Tu Correo' }
 * }
 */
export const generateFormHTML = (schema, options = {}) => {
  const {
    action = '#',
    method = 'POST',
    submitText = 'Enviar',
    className = 'unival-form',
  } = options;

  let fieldsHTML = '';

  for (const fieldName in schema) {
    const r = normalizeRules(schema[fieldName]);
    const attrs = objectToHtmlAttrs(toHtmlAttributes(r));
    const label = r.label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    fieldsHTML += `
      <div class="field-group">
        <label for="${fieldName}">${label}</label>
        <input name="${fieldName}" id="${fieldName}" ${attrs}>
        <span class="error-msg" id="error-${fieldName}"></span>
      </div>
    `;
  }

  return `
    <form action="${action}" method="${method}" class="${className}" id="unival-generated-form">
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
      throw new TypeError('FormGenerator.generate(config): config debe ser un array');
    }
    if (!adapter) {
      throw new TypeError('FormGenerator.generate(config, adapter): adapter es requerido');
    }

    // Normalizamos a un schema objeto para reutilizar el render HTML base.
    // Respetamos type=submit como botón final.
    const schema = {};
    let submitText = options.submitText || 'Enviar';

    for (const item of config) {
      if (!item || typeof item !== 'object') continue;

      if (item.type === 'submit') {
        submitText = item.value || submitText;
        continue;
      }

      // Permitimos rules string ("required|email|min:8") y rules objeto.
      const normalizedRules = item.rules ? normalizeRules(item.rules) : {};

      schema[item.name] = {
        ...item,
        ...normalizedRules,
      };
    }

    // Si el adapter provee un renderForm, delegamos ahí.
    if (typeof adapter.renderForm === 'function') {
      return adapter.renderForm(schema, { ...options, submitText });
    }

    // Fallback: generador HTML default.
    return generateFormHTML(schema, { ...options, submitText });
  }
}

function objectToHtmlAttrs(attrs) {
  return Object.entries(attrs)
    .map(([key, value]) => {
      if (value === true) return key;
      if (value === undefined || value === false) return '';
      return `${key}="${value}"`;
    })
    .join(' ');
}
