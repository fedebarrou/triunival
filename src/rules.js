// src/rules.js
// Utilidades compartidas: parseo/normalización de reglas.

/**
 * Convierte reglas estilo string ("required|email|min:8") a un objeto normalizado.
 * También soporta el formato objeto existente (backwards compatible).
 */
export function normalizeRules(rules) {
  if (!rules) return {};

  // Backwards compatible: si ya viene como objeto, lo clonamos y normalizamos keys.
  if (typeof rules === 'object' && !Array.isArray(rules)) {
    const out = { ...rules };

    // Alias suaves (por si vienen de otra capa)
    if (out.minLength != null && out.min == null) out.min = out.minLength;
    if (out.maxLength != null && out.max == null) out.max = out.maxLength;
    if (out.min_value != null && out.minValue == null) out.minValue = out.min_value;
    if (out.max_value != null && out.maxValue == null) out.maxValue = out.max_value;

    return out;
  }

  // String rules: "required|string|min:8" (acepta | o , como separador)
  if (typeof rules !== 'string') return {};

  const out = {};
  const parts = rules
    .split(/[|,]/g)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    const [name, rawArg] = part.split(':');
    const arg = rawArg?.trim();

    switch (name) {
      case 'required':
        out.required = true;
        break;
      case 'string':
        out.type = out.type || 'text';
        break;
      case 'email':
        out.type = 'email';
        out.email = true;
        break;
      case 'password':
        out.type = 'password';
        break;
      case 'number':
      case 'numeric':
        out.type = 'number';
        out.number = true;
        break;
      case 'url':
        out.type = 'url';
        out.url = true;
        break;
      case 'min':
        out.min = toInt(arg);
        break;
      case 'max':
        out.max = toInt(arg);
        break;
      case 'minValue':
      case 'min_value':
        out.minValue = toNumber(arg);
        break;
      case 'maxValue':
      case 'max_value':
        out.maxValue = toNumber(arg);
        break;
      case 'pattern':
        if (arg) out.pattern = arg;
        break;
      default:
        // Ignoramos reglas desconocidas (tolerante)
        break;
    }
  }

  return out;
}

function toInt(v) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

function toNumber(v) {
  const n = Number(String(v ?? ''));
  return Number.isFinite(n) ? n : undefined;
}
