import { IR_LOOP_VAR, LOOP_PROPERTY_MAP } from "../../ir-constants.js";

/**
 * Renders IR nodes back to Nunjucks template syntax
 * @type {Renderer}
 */
export function render(ir) {
  return ir.map(renderNode).join("");
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
      const filters =
        node.filters.length > 0
          ? " | " +
            node.filters
              .map((f) => {
                if (f.args && f.args.length > 0) {
                  return `${f.name}(${f.args.join(", ")})`;
                }
                return f.name;
              })
              .join(" | ")
          : "";
      const accessPath = node.postfix
        .map((part, i) => {
          if (i === 0) {
            if (part === null) return "null";
            // Convert special IR loop variable back to nunjucks loop
            if (part === IR_LOOP_VAR) return "loop";
            return part;
          }
          if (typeof part === "number") return `[${part}]`;
          // Convert special IR property names back to nunjucks-specific names
          if (node.postfix[0] === IR_LOOP_VAR && part === "__REVINDEX__")
            return ".revindex";
          return `.${part}`;
        })
        .join("");

      const leftBrace = node.trimLeft ? "{{-" : "{{";
      const rightBrace = node.trimRight ? "-}}" : "}}";
      return `${leftBrace} ${accessPath}${filters} ${rightBrace}`;
    }
    case "conditional": {
      let result = "";
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";

      if (node.variant === "unless") {
        // Nunjucks doesn't have unless, convert to if not
        result += `${leftBrace} if not ${node.branches[0].condition} ${rightBrace}`;
        result += node.branches[0].children.map(renderNode).join("");
        result += `${leftBrace} endif ${rightBrace}`;
      } else if (node.variant === "case") {
        // Nunjucks doesn't have case/when, convert to if/elif chain
        const caseExpr = node.branches[0].condition;

        node.branches.slice(1).forEach((branch, index) => {
          if (branch.condition) {
            const keyword = index === 0 ? "if" : "elif";
            result += `${leftBrace} ${keyword} ${caseExpr} == ${branch.condition} ${rightBrace}`;
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
            result += `${leftBrace} if ${branch.condition} ${rightBrace}`;
          } else if (branch.condition) {
            result += `${leftBrace} elif ${branch.condition} ${rightBrace}`;
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
      return `${leftBrace} for ${node.args} ${rightBrace}${children}${elseClause}${leftBrace} endfor ${rightBrace}`;
    }
    case "comment": {
      return `{# ${node.content} #}`;
    }
    case "assignment": {
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";

      if (node.children && node.children.length > 0) {
        // Block assignment: {% set x %}...{% endset %}
        const children = node.children.map(renderNode).join("");
        return `${leftBrace} set ${node.target} ${rightBrace}${children}${leftBrace} endset ${rightBrace}`;
      } else {
        // Inline assignment: {% set x = y %}
        return `${leftBrace} set ${node.target} = ${node.expression} ${rightBrace}`;
      }
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
