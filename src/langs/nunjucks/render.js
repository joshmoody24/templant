import {
  IR_LOOP_VAR,
  IR_LOOP_REVINDEX,
  IR_FILTERS,
} from "../../ir-constants.js";

const IR_TO_NUNJUCKS_FILTERS = {
  [IR_FILTERS.UPPERCASE]: "upper",
  [IR_FILTERS.LOWERCASE]: "lower",
  [IR_FILTERS.TRIM]: "trim",
};

const IR_OPERATOR_FILTERS = {
  [IR_FILTERS.ADD]: "+",
  [IR_FILTERS.SUBTRACT]: "-",
  [IR_FILTERS.MULTIPLY]: "*",
  [IR_FILTERS.DIVIDE]: "/",
  [IR_FILTERS.MODULO]: "%",
  [IR_FILTERS.COMPARE_EQ]: "==",
  [IR_FILTERS.COMPARE_NE]: "!=",
  [IR_FILTERS.COMPARE_GT]: ">",
  [IR_FILTERS.COMPARE_GTE]: ">=",
  [IR_FILTERS.COMPARE_LT]: "<",
  [IR_FILTERS.COMPARE_LTE]: "<=",
  [IR_FILTERS.LOGICAL_AND]: "and",
  [IR_FILTERS.LOGICAL_OR]: "or",
  [IR_FILTERS.CONTAINS]: "in",
};

// Operator precedence (higher number = higher precedence)
const OPERATOR_PRECEDENCE = {
  [IR_FILTERS.LOGICAL_OR]: 1,
  [IR_FILTERS.LOGICAL_AND]: 2,
  [IR_FILTERS.COMPARE_EQ]: 3,
  [IR_FILTERS.COMPARE_NE]: 3,
  [IR_FILTERS.COMPARE_GT]: 3,
  [IR_FILTERS.COMPARE_GTE]: 3,
  [IR_FILTERS.COMPARE_LT]: 3,
  [IR_FILTERS.COMPARE_LTE]: 3,
  [IR_FILTERS.CONTAINS]: 3,
  [IR_FILTERS.ADD]: 4,
  [IR_FILTERS.SUBTRACT]: 4,
  [IR_FILTERS.MULTIPLY]: 5,
  [IR_FILTERS.DIVIDE]: 5,
  [IR_FILTERS.MODULO]: 5,
};

const IR_TO_NUNJUCKS_LOOP_PROPERTIES = {
  [IR_LOOP_REVINDEX]: "revindex",
};

const SPECIAL_FILTER_RENDERERS = {
  truncate: (f, filterName, renderOutputExpression) => {
    const lengthStr = renderOutputExpression(f.length);
    const killWordsStr = f.killWords ? "true" : "false";
    const endStr = f.end ? renderOutputExpression(f.end) : "'...'";
    return `${filterName}(${lengthStr}, ${killWordsStr}, ${endStr})`;
  },
  replace: (f, filterName, renderOutputExpression) => {
    const oldStr = renderOutputExpression(f.old);
    const newStr = renderOutputExpression(f.new);
    const args = f.flags
      ? `${oldStr}, ${newStr}, ${renderOutputExpression(f.flags)}`
      : `${oldStr}, ${newStr}`;
    return `${filterName}(${args})`;
  },
  where: (f, filterName, renderOutputExpression) => {
    const attrStr = renderOutputExpression(f.attribute);
    // In Nunjucks, selectattr('attribute') defaults to checking for truthiness
    // Only include the value if it's not true (boolean) or 'true' (string)
    if (
      f.value &&
      f.value.postfix[0] !== true &&
      f.value.postfix[0] !== "true"
    ) {
      const valueStr = renderOutputExpression(f.value);
      return `selectattr(${attrStr}, ${valueStr})`;
    }
    return `selectattr(${attrStr})`;
  },
  sort: (f, filterName, renderOutputExpression) => {
    const parts = [];
    if (f.attribute) {
      parts.push(`attribute=${renderOutputExpression(f.attribute)}`);
    }
    if (f.reverse) {
      parts.push(`reverse=${f.reverse}`);
    }
    return parts.length > 0 ? `${filterName}(${parts.join(", ")})` : filterName;
  },
};

/**
 * Renders IR nodes back to Nunjucks template syntax
 * @type {Renderer}
 */
export function render(ir) {
  return ir.map(renderNode).join("");
}

function renderOutputExpression(expr) {
  if (expr === null) {
    // Handle null case
    return "";
  }
  let expression = expr.postfix
    .map((part, i) => {
      if (i === 0) {
        if (part === null) return "null";
        if (part === "") return "''"; // Convert empty string to quoted empty string
        if (part === IR_LOOP_VAR) return "loop";
        return part;
      }
      if (typeof part === "number") return `[${part}]`;
      if (
        expr.postfix[0] === IR_LOOP_VAR &&
        IR_TO_NUNJUCKS_LOOP_PROPERTIES[part]
      ) {
        return `.${IR_TO_NUNJUCKS_LOOP_PROPERTIES[part]}`;
      }
      return `.${part}`;
    })
    .join("");

  let filterStr = "";
  let lastOperatorPrecedence = Infinity; // Start with highest precedence

  for (const f of expr.filters) {
    const filterArgs = f.args
      ? f.args.map((arg) => renderOutputExpression(arg)).join(", ")
      : ""; // Render IrOutputNode arguments
    if (IR_OPERATOR_FILTERS[f.name]) {
      const operator = IR_OPERATOR_FILTERS[f.name];
      const currentPrecedence = OPERATOR_PRECEDENCE[f.name] || 0;

      // Add parentheses if the previous operation had lower precedence than current
      if (
        lastOperatorPrecedence < currentPrecedence &&
        lastOperatorPrecedence !== Infinity
      ) {
        expression = `(${expression})`;
      }

      expression = `${expression} ${operator} ${filterArgs}`;
      lastOperatorPrecedence = currentPrecedence;
    } else if (f.name === IR_FILTERS.LOGICAL_NOT) {
      expression = `not ${expression}`;
    } else if (
      f.name.startsWith("__COMPARE_") ||
      f.name.startsWith("__LOGICAL_")
    ) {
      const operator = IR_OPERATOR_FILTERS[f.name];
      expression = `(${expression} ${operator} ${filterArgs})`;
    } else {
      const filterName = IR_TO_NUNJUCKS_FILTERS[f.name] || f.name;
      let renderedFilter = filterName;

      const renderer = SPECIAL_FILTER_RENDERERS[f.name];
      if (renderer) {
        renderedFilter = renderer(f, filterName, renderOutputExpression);
      } else if (filterArgs.length > 0) {
        renderedFilter = `${filterName}(${filterArgs})`;
      }

      filterStr += ` | ${renderedFilter}`;
    }
  }
  const result = `${expression}${filterStr}`;

  // Add parentheses for complex filter chains with named parameters
  // Check if we have multiple filters and at least one uses named parameters
  if (expr.filters.length > 1) {
    const hasNamedParams = expr.filters.some((f) => {
      // Check if this is a special filter that uses named parameters like sort(attribute='...')
      const renderer = SPECIAL_FILTER_RENDERERS[f.name];
      if (renderer) {
        // Sort filter with attribute uses named parameter syntax
        return f.name === "sort" && f.attribute;
      }
      return false;
    });

    if (hasNamedParams) {
      return `(${result})`;
    }
  }

  return result;
}

/**
 * Renders a single IR node to Nunjucks syntax
 * @param {IrNode} node - The IR node to render
 * @returns {string} The rendered Nunjucks syntax
 */
function renderNode(node) {
  switch (node.type) {
    case "text":
      return node.content;
    case "output": {
      const expressionStr = renderOutputExpression(node.expression);
      const leftBrace = node.trimLeft ? "{{-" : "{{";
      const rightBrace = node.trimRight ? "-}}" : "}}";
      return `${leftBrace} ${expressionStr} ${rightBrace}`;
    }
    case "conditional": {
      let result = "";
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";

      if (node.variant === "unless") {
        // Nunjucks doesn't have unless, convert to if not
        result += `${leftBrace} if not ${renderOutputExpression(node.branches[0].condition)} ${rightBrace}`;
        result += node.branches[0].children.map(renderNode).join("");
        result += `${leftBrace} endif ${rightBrace}`;
      } else if (node.variant === "case") {
        // Nunjucks doesn't have case/when, convert to if/elif chain
        const caseExpr = renderOutputExpression(node.branches[0].condition);

        node.branches.slice(1).forEach((branch, index) => {
          if (branch.condition) {
            const keyword = index === 0 ? "if" : "elif";
            result += `${leftBrace} ${keyword} ${caseExpr} == ${renderOutputExpression(branch.condition)} ${rightBrace}`;
            result += branch.children.map(renderNode).join("");
          } else {
            result += `${leftBrace} else ${rightBrace}`;
            result += branch.children.map(renderNode).join("");
          }
        });

        result += `${leftBrace} endif ${rightBrace}`;
      } else {
        // Regular if statements
        node.branches.forEach((branch, index) => {
          if (index === 0) {
            result += `${leftBrace} if ${renderOutputExpression(branch.condition)} ${rightBrace}`;
          } else if (branch.condition) {
            result += `${leftBrace} elif ${renderOutputExpression(branch.condition)} ${rightBrace}`;
          } else {
            result += `${leftBrace} else ${rightBrace}`;
          }

          result += branch.children.map(renderNode).join("");
        });

        result += `${leftBrace} endif ${rightBrace}`;
      }

      return result;
    }
    case "loop": {
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";
      const children = node.children
        ? node.children.map(renderNode).join("")
        : "";
      const elseClause =
        node.elseChildren && node.elseChildren.length > 0
          ? `${leftBrace} else ${rightBrace}` +
            node.elseChildren.map(renderNode).join("")
          : "";
      const collectionStr = renderOutputExpression(node.args.collection);
      return `${leftBrace} for ${node.args.variable} in ${collectionStr} ${rightBrace}${children}${elseClause}${leftBrace} endfor ${rightBrace}`;
    }
    case "comment": {
      return `{# ${node.content} #}`;
    }
    case "assignment": {
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";

      if (node.expression === null) {
        // Block assignment: {% set x %}...{% endset %}
        const children = node.children.map(renderNode).join("");
        return `${leftBrace} set ${node.target} ${rightBrace}${children}${leftBrace} endset ${rightBrace}`;
      } else {
        // Inline assignment: {% set x = y %}
        const expressionStr = renderOutputExpression(node.expression);
        return `${leftBrace} set ${node.target} = ${expressionStr} ${rightBrace}`;
      }
    }
    case "raw": {
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";
      return `${leftBrace} raw ${rightBrace}${node.content}${leftBrace} endraw ${rightBrace}`;
    }
    case "include": {
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";
      const templateStr = renderOutputExpression(node.template);
      return `${leftBrace} include ${templateStr} ${rightBrace}`;
    }
    case "tag": {
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";
      const args = node.args ? ` ${node.args}` : "";

      // Check for unsupported tags
      if (node.name === "break" || node.name === "continue") {
        throw new Error(
          `Nunjucks does not support '${node.name}' statements. Consider restructuring your loop logic with conditional statements instead.`,
        );
      }

      // Map some liquid-specific tags to nunjucks equivalents
      let tagName = node.name;

      const opening = `${leftBrace} ${tagName}${args} ${rightBrace}`;

      // Self-closing tags don't need end tags
      const selfClosingTags = ["include"];
      if (selfClosingTags.includes(tagName)) {
        return opening;
      }

      const children = node.children
        ? node.children.map(renderNode).join("")
        : "";
      return opening + children + `${leftBrace} end${tagName} ${rightBrace}`;
    }
    default:
      throw new Error(`Unsupported IR node type: ${node.type}`);
  }
}
