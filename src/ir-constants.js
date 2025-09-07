/**
 * Special IR identifiers for language-agnostic representation
 */

/** Special variable name used in IR to represent loop variables */
export const IR_LOOP_VAR = "__LOOP_VAR__";

/** Map of loop property names from language-specific to IR-agnostic */
export const LOOP_PROPERTY_MAP = {
  // Liquid to IR
  rindex: "__REVINDEX__",

  // Nunjucks to IR
  revindex: "__REVINDEX__",
};
