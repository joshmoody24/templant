/**
 * Renders IR nodes back to Liquid template syntax
 * @type {import("..").Renderer}
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
      return `{{ ${node.postfix.join(".")}${filters} }}`;
    }
    case "tag":
      return `{% ${node.name} %}`; // TODO: flesh this out
    default:
      throw new Error(`Unsupported IR node type: ${node.type}`);
  }
}

