// src/index.js

import { UniVal, validate } from "./core.js";
import { FormGenerator, generateFormHTML } from "./formGenerator.js";
import { HtmlAdapter, toHtmlAttributes } from "./htmlAdapter.js";
import { normalizeRules } from "./rules.js";

// Default export (backwards compatible)
export default UniVal;

// Named exports (modern usage)
export { UniVal, validate, FormGenerator, generateFormHTML, HtmlAdapter, toHtmlAttributes, normalizeRules };

// Namespace-style export (opcional, no rompe nada)
export const Triunival = {
  validate,
  UniVal,
  FormGenerator,
  generateFormHTML,
  HtmlAdapter,
  toHtmlAttributes,
  normalizeRules,
};
