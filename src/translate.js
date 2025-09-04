/**
 * Translate templates between different template languages
 */

/**
 * @typedef {'nunjucks' | 'ejs' | 'handlebars' | 'liquid' | 'mustache' | 'pug'} TemplateLanguage
 */
const SUPPORTED_LANGUAGES = new Set([
  "nunjucks",
  "ejs",
  "handlebars",
  "liquid",
  "mustache",
  "pug",
]);

/**
 * @typedef {Object} TranslateArgs
 * @property {TemplateLanguage} from - Source template language
 * @property {TemplateLanguage} to - Target template language
 * @property {string} input - Template string to translate
 */

/**
 * Validates translate arguments
 * @param {TranslateArgs} args - Arguments to validate
 * @throws {Error} If arguments are invalid
 */
function validateArgs(args) {
  const errors = [];

  if (!args?.from) {
    errors.push('Invalid argument "from": expected string (e.g. "nunjucks")');
  }
  if (!args?.to) {
    errors.push('Invalid argument "to": expected string (e.g. "mustache")');
  }
  if (!args?.input) {
    errors.push(
      'Invalid argument "input": expected string (the template content)',
    );
  }

  if (args?.from && !SUPPORTED_LANGUAGES.has(args.from)) {
    errors.push(
      `Invalid argument "from": unsupported language "${args.from}". Supported: ${Array.from(SUPPORTED_LANGUAGES).join(", ")}`,
    );
  }
  if (args?.to && !SUPPORTED_LANGUAGES.has(args.to)) {
    errors.push(
      `Invalid argument "to": unsupported language "${args.to}". Supported: ${Array.from(SUPPORTED_LANGUAGES).join(", ")}`,
    );
  }
  if (args?.input && typeof args.input !== "string") {
    errors.push(
      'Invalid argument "input": expected string (the template content)',
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

/**
 * Translates a template from one language to another
 * @param {object} args - Translation arguments
 * @param {TemplateLanguage} args.from - Source template language
 * @param {TemplateLanguage} args.to - Target template language
 * @param {string} args.input - Template string to translate
 */
export function translate(args) {
  validateArgs(args);
  const { from, to, input } = args;

  // TODO: implement actual translation logic
  return `<!-- Translated from ${from} to ${to} -->\n${input}`;
}

