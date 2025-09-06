import { Liquid, TokenKind } from "liquidjs";

/**
 * Parses a Liquid template string and returns the first token of the parsed template.
 * @type {import("..").Parser}
 */
export function parse(template) {
  const liquid = new Liquid();
  const templates = liquid.parse(template);
  return templates.map(convertTemplate);
}

/**
 * Converts a Liquid token to an intermediate representation (IR) node.
 * @param {import("liquidjs").Template} template - The Liquid token to convert.
 * @returns {IrNode} The corresponding IR node.
 */
function convertTemplate(template) {
  switch (template.token.kind) {
    case TokenKind.HTML:
      return {
        type: "text",
        // @ts-ignore
        content: template.str,
      };
    case TokenKind.Output:
      return {
        type: "output",
        // @ts-ignore
        filters: template.value.filters.map((f) => f.name), // TODO: map names to standard names
        // TODO: is flatMap correct here?
        // @ts-ignore
        postfix: template.value.initial.postfix.flatMap((p) =>
          // @ts-ignore
          p.props.map((p) => p.content),
        ),
      };
    case TokenKind.Tag:
      return {
        type: "tag",
        // @ts-ignore
        name: template.name,
        attributes: {},
        children: [],
      };
    default:
      throw new Error(`Unsupported token kind: ${template.token.kind}`);
  }
}
