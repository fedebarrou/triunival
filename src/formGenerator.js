// src/formGenerator.js
import { toHtmlAttributes } from './htmlAdapter.js';

export const generateFormHTML = (schema, options = {}) => {
  const { action = '#', method = 'POST', submitText = 'Enviar', className = 'unival-form' } = options;

  let fieldsHTML = '';

  for (const fieldName in schema) {
    const rules = schema[fieldName];
    const attrs = terrorToHtmlString(toHtmlAttributes(rules));
    const label = rules.label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

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

// Helper para convertir el objeto de atributos en un string de HTML
function terrorToHtmlString(attrs) {
  return Object.entries(attrs)
    .map(([key, value]) => {
      if (value === true) return key;
      if (value === undefined || value === false) return '';
      return `${key}="${value}"`;
    })
    .join(' ');
}
