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
        node.filters.length > 0 ? " | " + node.filters.join(" | ") : "";
      const accessPath = node.postfix
        .map((part, i) =>
          i === 0 ? part : typeof part === "number" ? `[${part}]` : `.${part}`,
        )
        .join("");
      return `{{ ${accessPath}${filters} }}`;
    }
    case "tag":
      return `{% ${node.name} %}`; // TODO: flesh this out
    default:
      throw new Error(`Unsupported IR node type: ${node.type}`);
  }
}
