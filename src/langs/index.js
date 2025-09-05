import { parse as parseLiquid } from "./liquid/parse.js";
import { render as renderLiquid } from "./liquid/render.js";

/**
 * @callback Parser
 * @param {string} content - Template content to parse
 * @returns {IrNode[]} Parsed intermediate representation (IR)
 */

/**
 * @callback Renderer
 * @param {IrNode[]} ir - Intermediate representation (IR) to render
 * @returns {string} Rendered template string
 */

/**
 * @type {Record<import("../translate").TemplateLanguage, Parser>}
 */
export const parsers = {
  liquid: parseLiquid,
};

/**
 * @type {Record<import("../translate").TemplateLanguage, Renderer>}
 */
export const renderers = {
  liquid: renderLiquid,
};
