import {
  IR_LOOP_VAR,
  IR_LOOP_REVINDEX,
  IR_FILTERS,
} from "../../ir-constants.js";

const IR_TO_LIQUID_FILTERS = {
  [IR_FILTERS.UPPERCASE]: "upcase",
  [IR_FILTERS.LOWERCASE]: "downcase",
  [IR_FILTERS.TRIM]: "strip",
  [IR_FILTERS.ADD]: "plus",
  [IR_FILTERS.SUBTRACT]: "minus",
  [IR_FILTERS.MULTIPLY]: "times",
  [IR_FILTERS.DIVIDE]: "divided_by",
  [IR_FILTERS.MODULO]: "modulo",
  [IR_FILTERS.COMPARE_EQ]: "==",
  [IR_FILTERS.COMPARE_NE]: "!=",
  [IR_FILTERS.COMPARE_GT]: ">",
  [IR_FILTERS.COMPARE_GTE]: ">=",
  [IR_FILTERS.COMPARE_LT]: "<",
  [IR_FILTERS.COMPARE_LTE]: "<=",
  [IR_FILTERS.LOGICAL_AND]: "and",
  [IR_FILTERS.LOGICAL_OR]: "or",
  [IR_FILTERS.LOGICAL_NOT]: "not",
  [IR_FILTERS.CONTAINS]: "contains",
};

const IR_TO_LIQUID_LOOP_PROPERTIES = {
  [IR_LOOP_REVINDEX]: "rindex",
};

const SPECIAL_FILTER_RENDERERS = {
  truncate: (filter, renderOutputExpression) => {
    const lengthStr = renderOutputExpression(filter.length);
    const endStr = filter.end ? renderOutputExpression(filter.end) : undefined;
    return endStr ? `: ${lengthStr}, ${endStr}` : `: ${lengthStr}`;
  },
  replace: (filter, renderOutputExpression) => {
    const oldStr = renderOutputExpression(filter.old);
    const newStr = renderOutputExpression(filter.new);
    return `: ${oldStr}, ${newStr}`;
  },
  where: (filter, renderOutputExpression) => {
    const attrStr = renderOutputExpression(filter.attribute);
    const valueStr = filter.value
      ? renderOutputExpression(filter.value)
      : "true";
    return `: ${attrStr}, ${valueStr}`;
  },
  sort: (filter, renderOutputExpression) => {
    // Convert to Liquid 'sort' filter
    if (filter.attribute) {
      const attrStr = renderOutputExpression(filter.attribute);
      return `: ${attrStr}`;
    }
    return "";
  },
};

/**
 * Renders IR nodes back to Liquid template syntax
 * @type {Renderer}
 */
export function render(ir) {
  return ir.map(renderNode).join("");
}

function renderOutputExpression(node) {
  if (node === null) {
    // Handle null case
    return "";
  }

  let expression = node.postfix
    .map((part, i) => {
      if (i === 0) {
        if (part === null) return "null";
        // Convert special IR loop variable back to liquid forloop
        if (part === IR_LOOP_VAR) return "forloop";
        return part;
      }
      if (typeof part === "number") return `[${part}]`;
      // Convert special IR property names back to liquid-specific names
      if (
        node.postfix[0] === IR_LOOP_VAR &&
        IR_TO_LIQUID_LOOP_PROPERTIES[part]
      ) {
        return `.${IR_TO_LIQUID_LOOP_PROPERTIES[part]}`;
      }
      return `.${part}`;
    })
    .join("");

  // Handle filters, treating infix operators specially
  for (const filter of node.filters) {
    const filterName = IR_TO_LIQUID_FILTERS[filter.name] || filter.name;
    const filterArgs = filter.args
      ? filter.args.map((arg) => renderOutputExpression(arg))
      : [];
    const isInfixOperator =
      filter.name.startsWith("__COMPARE_") ||
      filter.name.startsWith("__LOGICAL_");

    if (isInfixOperator) {
      // Render as infix operator: "user.age >= 18"
      if (filterArgs.length > 0) {
        expression = `${expression} ${filterName} ${filterArgs[0]}`;
      }
    } else {
      // Handle special filters with normalized arguments
      let filterStr = ` | ${filterName}`;

      const renderer = SPECIAL_FILTER_RENDERERS[filter.name];
      if (renderer) {
        filterStr = ` | ${filterName}${renderer(filter, renderOutputExpression)}`;
      } else if (filterArgs.length > 0) {
        filterStr += `: ${filterArgs.join(", ")}`;
      }

      expression += filterStr;
    }
  }

  return expression;
}

/**
 * Renders a single IR node to Liquid syntax
 * @param {IrNode} node - The IR node to render
 * @returns {string} The rendered Liquid syntax
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

      if (node.variant === "case") {
        // For case statements: first branch has the case expression
        result += `${leftBrace} case ${renderOutputExpression(node.branches[0].condition)} ${rightBrace}`;

        node.branches.slice(1).forEach((branch) => {
          if (branch.condition) {
            result += `${leftBrace} when ${renderOutputExpression(branch.condition)} ${rightBrace}`;
          } else {
            result += `${leftBrace} else ${rightBrace}`;
          }
          result += branch.children.map(renderNode).join("");
        });

        result += `${leftBrace} endcase ${rightBrace}`;
      } else if (node.variant === "unless") {
        // For unless statements
        result += `${leftBrace} unless ${renderOutputExpression(node.branches[0].condition)} ${rightBrace}`;
        result += node.branches[0].children.map(renderNode).join("");
        result += `${leftBrace} endunless ${rightBrace}`;
      } else {
        // For if statements
        node.branches.forEach((branch, index) => {
          if (index === 0) {
            result += `${leftBrace} if ${renderOutputExpression(node.branches[0].condition)} ${rightBrace}`;
          } else if (branch.condition) {
            result += `${leftBrace} elsif ${renderOutputExpression(branch.condition)} ${rightBrace}`;
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
      return `{% comment %}${node.content}{% endcomment %}`;
    }
    case "assignment": {
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";

      if (node.expression === null) {
        // Block assignment (capture)
        const children = node.children.map(renderNode).join("");
        return `${leftBrace} capture ${node.target} ${rightBrace}${children}${leftBrace} endcapture ${rightBrace}`;
      } else {
        // Inline assignment (assign)
        const expressionStr = renderOutputExpression(node.expression);
        return `${leftBrace} assign ${node.target} = ${expressionStr} ${rightBrace}`;
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

      // Map some liquid-specific tags to nunjucks equivalents
      let tagName = node.name;

      const opening = `${leftBrace} ${tagName}${args} ${rightBrace}`;

      // Self-closing tags don't need end tags
      const selfClosingTags = ["include", "break", "continue"];
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
