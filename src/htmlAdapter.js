// src/htmlAdapter.js

/**
 * Transforma las reglas de validación en atributos estándar de HTML5.
 * Esto permite que el navegador valide antes de que JS siquiera actúe.
 */
export const toHtmlAttributes = (rules) => {
  if (!rules) return {};

  const attrs = {};

  // Mapeo de tipos
  if (rules.type) {
    const typeMap = {
      email: 'email',
      password: 'password',
      number: 'number',
      url: 'url',
      date: 'date'
    };
    attrs.type = typeMap[rules.type] || 'text';
  }

  // Restricciones de presencia y longitud
  if (rules.required) attrs.required = true;
  if (rules.min) attrs.minLength = rules.min;
  if (rules.max) attrs.maxLength = rules.max;

  // Restricciones numéricas
  if (rules.minValue !== undefined) attrs.min = rules.minValue;
  if (rules.maxValue !== undefined) attrs.max = rules.maxValue;

  // Validación por expresión regular (RegExp)
  if (rules.pattern) {
    attrs.pattern = rules.pattern instanceof RegExp
      ? rules.pattern.source
      : rules.pattern;
  }

  return attrs;
};