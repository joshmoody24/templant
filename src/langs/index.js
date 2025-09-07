import { parse as parseLiquid } from "./liquid/parse.js";
import { render as renderLiquid } from "./liquid/render.js";
import { parse as parseNunjucks } from "./nunjucks/parse.js";
import { render as renderNunjucks } from "./nunjucks/render.js";

/**
 * @type {Record<BuiltInLanguage, Parser>}
 */
export const parsers = {
  liquid: parseLiquid,
  nunjucks: parseNunjucks,
};

/**
 * @type {Record<BuiltInLanguage, Renderer>}
 */
export const renderers = {
  liquid: renderLiquid,
  nunjucks: renderNunjucks,
};
