import { toHtmlAttributes } from './htmlAdapter.js';
import { generateFormHTML } from './formGenerator.js';

export class UniVal {
  constructor(schema) {
    this.schema = schema;
    this.formElement = null;
  }

  /**
   * Genera el HTML y lo inyecta en un contenedor o devuelve el string.
   */
  render(options = {}, containerId = null) {
    const html = generateFormHTML(this.schema, options);
    if (containerId) {
      const el = document.getElementById(containerId);
      if (el) {
        el.innerHTML = html;
        this.initAutomanage(); // Activa autogestión si se inyecta en el DOM
      }
    }
    return html;
  }

  /**
   * AUTOGESTIÓN: Captura el evento submit, valida y envía por API.
   */
  initAutomanage(onSuccess, onError) {
    // Buscamos el formulario generado por nuestra librería
    const form = document.getElementById('unival-generated-form');
    if (!form) return;
    this.formElement = form;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Limpiar errores previos
      this._clearErrors();

      // Recolectar datos
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // VALIDACIÓN ASÍNCRONA (Capa JS)
      const result = await this.validate(data);

      if (!result.isValid) {
        this._showErrors(result.errors);
        if (onError) onError(result.errors);
        return;
      }

      // ENVÍO AUTOMÁTICO (Capa API)
      try {
        const response = await fetch(form.action, {
          method: form.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const apiResult = await response.json();

        if (!response.ok) {
          // Si el backend (Capa Back) rechaza, mostramos esos errores
          if (apiResult.errors) this._showErrors(apiResult.errors);
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

  /**
   * VALIDACIÓN ASÍNCRONA TOTAL (Capa Back/JS)
   */
  async validate(data) {
    const errors = {};
    const promises = Object.keys(this.schema).map(async (field) => {
      const rules = this.schema[field];
      const value = data[field];

      // 1. Reglas Síncronas
      if (rules.required && (!value || String(value).trim() === "")) {
        errors[field] = "Obligatorio";
        return;
      }
      if (rules.min && value?.length < rules.min) {
        errors[field] = `Mínimo ${rules.min} caracteres`;
        return;
      }

      // 2. Reglas Asíncronas (DB, APIs externas)
      if (rules.validate && typeof rules.validate === 'function') {
        const customMsg = await rules.validate(value, data);
        if (typeof customMsg === 'string') errors[field] = customMsg;
        else if (customMsg === false) errors[field] = "Inválido";
      }
    });

    await Promise.all(promises);
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  // Helpers internos para la gestión de la UI
  _showErrors(errors) {
    for (const field in errors) {
      const errorSpan = document.getElementById(`error-${field}`);
      const input = document.getElementById(field);
      if (errorSpan) errorSpan.innerText = errors[field];
      if (input) input.classList.add('unival-input-error');
    }
  }

  _clearErrors() {
    const spans = document.querySelectorAll('.error-msg');
    const inputs = document.querySelectorAll('input');
    spans.forEach(s => s.innerText = '');
    inputs.forEach(i => i.classList.remove('unival-input-error'));
  }
}
