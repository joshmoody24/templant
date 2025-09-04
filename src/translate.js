/**
 * Translate templates between different template languages
 */

const SUPPORTED_LANGUAGES = new Set([
  'nunjucks', 'ejs', 'handlebars', 'liquid', 'mustache', 'pug'
]);

/**
 * @typedef {'nunjucks' | 'ejs' | 'handlebars' | 'liquid' | 'mustache' | 'pug'} TemplateLanguage
 */

/**
 * Validates translate arguments
 * @param {Object} args - The arguments to validate
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
    errors.push('Invalid argument "input": expected string (the template content)');
  }
  
  if (args?.from && !SUPPORTED_LANGUAGES.has(args.from)) {
    errors.push(`Invalid argument "from": unsupported language "${args.from}". Supported: ${Array.from(SUPPORTED_LANGUAGES).join(', ')}`);
  }
  if (args?.to && !SUPPORTED_LANGUAGES.has(args.to)) {
    errors.push(`Invalid argument "to": unsupported language "${args.to}". Supported: ${Array.from(SUPPORTED_LANGUAGES).join(', ')}`);
  }
  if (args?.input && typeof args.input !== 'string') {
    errors.push('Invalid argument "input": expected string (the template content)');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

/**
 * Translates a template from one language to another
 * @param {Object} options - Translation options
 * @param {TemplateLanguage} options.from - Source template language
 * @param {TemplateLanguage} options.to - Target template language  
 * @param {string} options.input - Template string to translate
 * @returns {string} Translated template string
 */
export function translate(options) {
  validateArgs(options);
  
  // TODO: implement actual translation logic
  return `<!-- Translated from ${options.from} to ${options.to} -->\n${options.input}`;
}