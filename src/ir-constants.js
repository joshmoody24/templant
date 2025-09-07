/**
 * Special IR identifiers for language-agnostic representation
 */

/** Special variable name used in IR to represent loop variables */
export const IR_LOOP_VAR = "__LOOP_VAR__";

/** Special property name for reverse index in a loop */
export const IR_LOOP_REVINDEX = "__REVINDEX__";

/**
 * Enum for built-in filters that have special handling in different languages
 * @enum {string}
 */
export const IR_FILTERS = {
  UPPERCASE: "__UPPERCASE__",
  LOWERCASE: "__LOWERCASE__",
  TRIM: "__TRIM__",
  ADD: "__ADD__",
  SUBTRACT: "__SUBTRACT__",
  MULTIPLY: "__MULTIPLY__",
  DIVIDE: "__DIVIDE__",
  MODULO: "__MODULO__",
  COMPARE_EQ: "__COMPARE_EQ__",
  COMPARE_NE: "__COMPARE_NE__",
  COMPARE_GT: "__COMPARE_GT__",
  COMPARE_GTE: "__COMPARE_GTE__",
  COMPARE_LT: "__COMPARE_LT__",
  COMPARE_LTE: "__COMPARE_LTE__",
  LOGICAL_AND: "__LOGICAL_AND__",
  LOGICAL_OR: "__LOGICAL_OR__",
  LOGICAL_NOT: "__LOGICAL_NOT__",
  CONTAINS: "__CONTAINS__",
};
