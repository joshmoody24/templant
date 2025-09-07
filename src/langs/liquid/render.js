/**
 * Renders IR nodes back to Liquid template syntax
 * @type {Renderer}
 */
export function render(ir) {
  return ir.map(renderNode).join("");
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
      const filters =
        node.filters.length > 0
          ? " | " +
            node.filters
              .map((f) => {
                if (f.args && f.args.length > 0) {
                  return `${f.name}: ${f.args.join(", ")}`;
                }
                return f.name;
              })
              .join(" | ")
          : "";
      const accessPath = node.postfix
        .map((part, i) =>
          i === 0 ? part : typeof part === "number" ? `[${part}]` : `.${part}`,
        )
        .join("");

      const leftBrace = node.trimLeft ? "{{-" : "{{";
      const rightBrace = node.trimRight ? "-}}" : "}}";
      return `${leftBrace} ${accessPath}${filters} ${rightBrace}`;
    }
    case "conditional": {
      let result = "";
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";

      if (node.variant === "case") {
        // For case statements: first branch has the case expression
        result += `${leftBrace} case ${node.branches[0].condition} ${rightBrace}`;

        node.branches.slice(1).forEach((branch) => {
          if (branch.condition) {
            result += `${leftBrace} when ${branch.condition} ${rightBrace}`;
          } else {
            result += `${leftBrace} else ${rightBrace}`;
          }
          result += branch.children.map(renderNode).join("");
        });

        result += `${leftBrace} endcase ${rightBrace}`;
      } else if (node.variant === "unless") {
        // For unless statements
        result += `${leftBrace} unless ${node.branches[0].condition} ${rightBrace}`;
        result += node.branches[0].children.map(renderNode).join("");
        result += `${leftBrace} endunless ${rightBrace}`;
      } else {
        // For if statements
        node.branches.forEach((branch, index) => {
          if (index === 0) {
            result += `${leftBrace} if ${branch.condition} ${rightBrace}`;
          } else if (branch.condition) {
            result += `${leftBrace} elsif ${branch.condition} ${rightBrace}`;
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
      return `{% comment %}${node.content}{% endcomment %}`;
    }
    case "tag": {
      const leftBrace = node.trimLeft ? "{%-" : "{%";
      const rightBrace = node.trimRight ? "-%}" : "%}";
      const args = node.args ? ` ${node.args}` : "";
      const opening = `${leftBrace} ${node.name}${args} ${rightBrace}`;

      // Self-closing tags don't need end tags
      const selfClosingTags = ["assign", "include", "break", "continue"];
      if (selfClosingTags.includes(node.name)) {
        return opening;
      }

      const children = node.children
        ? node.children.map(renderNode).join("")
        : "";
      return opening + children + `${leftBrace} end${node.name} ${rightBrace}`;
    }
    default:
      throw new Error(`Unsupported IR node type: ${node.type}`);
  }
}
