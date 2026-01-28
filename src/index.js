// src/index.js

// Default export (backwards compatible)
export { UniVal as default, UniVal } from './core.js';

// Core
export { validate } from './core.js';

// Generator + Adapters
export { FormGenerator, generateFormHTML } from './formGenerator.js';
export { HtmlAdapter, toHtmlAttributes } from './htmlAdapter.js';

// Utils
export { normalizeRules } from './rules.js';
