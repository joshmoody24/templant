/**
 * Translate templates between different template languages
 */

import { parsers, renderers } from "./langs/index.js";

/**
 * Validates translate arguments
 * @param {import("./translate.js").TranslateArgs} args - Arguments to validate
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
 * @template {Record<string, Parser>} [CustomParsers = {}]
 * @template {Record<string, Renderer>} [CustomRenderers = {}]
 *
 * Translate templates between different template languages.
 *
 * @param {import("./translate.js").TranslateArgs<CustomParsers, CustomRenderers>} args
 * @returns {string}
 */
export function translate(args) {
  validateArgs(args);
  const { from, to, input } = args;
  // @ts-ignore
  const parser = { ...parsers, ...args.customParsers }[from];
  if (!parser) {
    throw new Error(`No parser found for language: ${from}`);
  }
  const ir = parser(input);
  // @ts-ignore
  const renderer = { ...renderers, ...args.customRenderers }[to];
  if (!renderer) {
    throw new Error(`No renderer found for language: ${to}`);
  }
  return renderer(ir);
}
