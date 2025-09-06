import { parse as parseLiquid } from "./liquid/parse.js";
import { render as renderLiquid } from "./liquid/render.js";

/**
 * @type {Record<BuiltInLanguage, Parser>}
 */
export const parsers = {
  liquid: parseLiquid,
};

/**
 * @type {Record<BuiltInLanguage, Renderer>}
 */
export const renderers = {
  liquid: renderLiquid,
};
