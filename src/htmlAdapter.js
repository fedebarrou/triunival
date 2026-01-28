// src/htmlAdapter.js

import { normalizeRules } from './rules.js';

/**
 * Transforma las reglas de validación en atributos estándar de HTML5.
 * Esto permite que el navegador valide antes de que JS siquiera actúe.
 */
export const toHtmlAttributes = (rules) => {
  const r = normalizeRules(rules);
  const attrs = {};

  // Mapeo de tipos
  if (r.type) {
    const typeMap = {
      email: 'email',
      password: 'password',
      number: 'number',
      url: 'url',
      date: 'date'
    };
    attrs.type = typeMap[r.type] || 'text';
  }

  // Restricciones de presencia y longitud
  if (r.required) attrs.required = true;
  if (r.min != null) attrs.minLength = r.min;
  if (r.max != null) attrs.maxLength = r.max;

  // Restricciones numéricas
  if (r.minValue !== undefined) attrs.min = r.minValue;
  if (r.maxValue !== undefined) attrs.max = r.maxValue;

  // Validación por expresión regular (RegExp)
  if (r.pattern) {
    attrs.pattern = r.pattern instanceof RegExp
      ? r.pattern.source
      : r.pattern;
  }

  return attrs;
};

/**
 * HtmlAdapter (nuevo): renderiza un schema normalizado a HTML.
 *
 * Firma esperada por FormGenerator:
 *   HtmlAdapter.renderForm(schema, options)
 */
export class HtmlAdapter {
  static renderForm(schema, options = {}) {
    const { action = '#', method = 'POST', submitText = 'Enviar', className = 'unival-form' } = options;

    let fieldsHTML = '';

    for (const fieldName in schema) {
      const rules = schema[fieldName];
      const r = normalizeRules(rules);
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