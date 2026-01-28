// src/core.js
// Core de validación (usable en backend y frontend)

import { normalizeRules } from './rules.js';
import { generateFormHTML } from './formGenerator.js';

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
      errors[field] = 'Obligatorio';
      return;
    }

    // Si está vacío y no es required, no aplicamos el resto
    if (isEmpty(value)) return;

    // 2) tipo/email/url/number
    if (normalized.email && !isEmail(String(value))) {
      errors[field] = 'Email inválido';
      return;
    }
    if (normalized.url && !isUrl(String(value))) {
      errors[field] = 'URL inválida';
      return;
    }
    if (normalized.number && !isNumeric(String(value))) {
      errors[field] = 'Debe ser un número';
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
      const re = normalized.pattern instanceof RegExp
        ? normalized.pattern
        : new RegExp(String(normalized.pattern));
      if (!re.test(String(value))) {
        errors[field] = 'Formato inválido';
        return;
      }
    }

    // 6) custom async validate (solo formato objeto)
    if (typeof normalized.validate === 'function') {
      const customMsg = await normalized.validate(value, data);
      if (typeof customMsg === 'string') errors[field] = customMsg;
      else if (customMsg === false) errors[field] = 'Inválido';
    }
  });

  await Promise.all(tasks);
  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * UniVal (backwards compatible)
 *
 * - Mantiene `render()` y `initAutomanage()` para navegador.
 * - En vez de embebido, usa el core `validate()`.
 *
 * Nota: esta clase usa DOM/fetch en métodos específicos. En backend,
 * importá y usá `validate()` directamente.
 */
export class UniVal {
  constructor(schema) {
    this.schema = schema;
    this.formElement = null;
  }

  render(options = {}, containerId = null) {
    const html = generateFormHTML(this.schema, options);
    if (containerId && typeof document !== 'undefined') {
      const el = document.getElementById(containerId);
      if (el) {
        el.innerHTML = html;
        this.initAutomanage();
      }
    }
    return html;
  }

  initAutomanage(onSuccess, onError) {
    if (typeof document === 'undefined') return;

    const form = document.getElementById('unival-generated-form');
    if (!form) return;
    this.formElement = form;

    form.addEventListener('submit', async (e) => {
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const apiResult = await response.json();

        if (!response.ok) {
          if (apiResult?.errors) this._showErrors(apiResult.errors);
          if (onError) onError(apiResult);
        } else {
          if (onSuccess) onSuccess(apiResult);
        }
      } catch (err) {
        console.error('Error de red o servidor:', err);
        if (onError) onError(err);
      }
    });
  }

  async validate(data) {
    return validate(data, this.schema);
  }

  _showErrors(errors) {
    if (typeof document === 'undefined') return;
    for (const field in errors) {
      const errorSpan = document.getElementById(`error-${field}`);
      const input = document.getElementById(field);
      if (errorSpan) errorSpan.innerText = errors[field];
      if (input) input.classList.add('unival-input-error');
    }
  }

  _clearErrors() {
    if (typeof document === 'undefined') return;
    const spans = document.querySelectorAll('.error-msg');
    const inputs = document.querySelectorAll('input');
    spans.forEach((s) => (s.innerText = ''));
    inputs.forEach((i) => i.classList.remove('unival-input-error'));
  }
}

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === '';
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
  if (s.trim() === '') return false;
  return Number.isFinite(Number(s));
}
