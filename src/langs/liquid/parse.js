import { Liquid, TokenKind } from "liquidjs";

/**
 * Parses a Liquid template string and returns the first token of the parsed template.
 * @type {Parser}
 */
export function parse(template) {
  const liquid = new Liquid();
  const templates = liquid.parse(template);
  return templates.flatMap(convertTemplate);
}

/**
 * Converts a Liquid token to an intermediate representation (IR) node.
 * @param {import("liquidjs").Template} template - The Liquid token to convert.
 * @returns {IrNode[]} The corresponding IR nodes.
 */
function convertTemplate(template) {
  switch (template.token.kind) {
    case TokenKind.HTML:
      return [
        {
          type: "text",
          // @ts-ignore
          content: template.str,
        },
      ];
    case TokenKind.Output:
      return [
        {
          type: "output",
          // @ts-ignore
          filters: template.value.filters.map((f) => ({
            name: f.name,
            args: f.args
              ? f.args.map((arg) => {
                  // Preserve original format from input string
                  const original = template.token.input.slice(
                    arg.begin,
                    arg.end,
                  );
                  return original;
                })
              : undefined,
          })),
          // @ts-ignore
          postfix: template.value.initial.postfix.flatMap((p) => {
            if (p.props) {
              // Property access like user.name
              return p.props.map((prop) => prop.content);
            } else if (p.literal !== undefined) {
              // Special literals like null, blank, empty
              return [p.literal];
            } else if (p.content !== undefined) {
              // Other literals like 'string', 42
              if (p.kind === TokenKind.Quoted) {
                // String literal - preserve original format from input
                const original = template.token.input.slice(p.begin, p.end);
                return [original];
              }
              return [p.content];
            }
            return [];
          }),
          trimLeft: template.token.trimLeft,
          trimRight: template.token.trimRight,
        },
      ];
    case TokenKind.Tag:
      // @ts-ignore
      if (template.branches) {
        let branches;

        if (template.name === "case") {
          const caseExpression = extractCondition(template.value);
          branches = [
            {
              condition: caseExpression,
              children: [], // Case expression has no direct children
            },
          ];

          template.branches.forEach((branch) => {
            const whenValues = branch.values
              ? branch.values.map((v) => `'${v.content}'`).join(", ")
              : null;
            branches.push({
              condition: whenValues,
              children: branch.templates
                ? branch.templates.flatMap(convertTemplate)
                : [],
            });
          });
        } else {
          branches = template.branches.map((branch, index) => ({
            condition:
              index === 0
                ? template.token.args
                : extractCondition(branch.value),
            children: branch.templates
              ? branch.templates.flatMap(convertTemplate)
              : [],
          }));
        }

        if (template.elseTemplates && template.elseTemplates.length > 0) {
          branches.push({
            condition: null,
            children: template.elseTemplates.flatMap(convertTemplate),
          });
        }

        return [
          {
            type: "conditional",
            variant:
              template.name === "case"
                ? "case"
                : template.name === "unless"
                  ? "unless"
                  : "if",
            branches: branches,
            trimLeft: template.token.trimLeft,
            trimRight: template.token.trimRight,
          },
        ];
      }

      if (template.templates) {
        if (template.name === "capture") {
          return [
            {
              type: "tag",
              name: "capture",
              args: template.token.args,
              children: template.templates.flatMap(convertTemplate),
              trimLeft: template.token.trimLeft,
              trimRight: template.token.trimRight,
            },
          ];
        }

        return [
          {
            type: "loop",
            args: template.token.args,
            children: template.templates.flatMap(convertTemplate),
            elseChildren:
              template.elseTemplates && template.elseTemplates.length > 0
                ? template.elseTemplates.flatMap(convertTemplate)
                : undefined,
            trimLeft: template.token.trimLeft,
            trimRight: template.token.trimRight,
          },
        ];
      }

      if (template.name === "comment") {
        // Extract comment content from raw input
        const input = template.token.input;
        const startTag = `{% comment %}`;
        const endTag = `{% endcomment %}`;
        const start = template.token.begin + startTag.length;
        const endStart = input.indexOf(endTag, start);
        const content = endStart > start ? input.slice(start, endStart) : "";

        return [
          {
            type: "comment",
            content: content,
          },
        ];
      }

      if (template.name === "raw") {
        // Extract raw content from tokens
        const content = template.tokens
          ? template.tokens
              .map((t) => template.token.input.slice(t.begin, t.end))
              .join("")
          : "";

        return [
          {
            type: "tag",
            name: "raw",
            args: template.token.args,
            children: content ? [{ type: "text", content: content }] : [],
            trimLeft: template.token.trimLeft,
            trimRight: template.token.trimRight,
          },
        ];
      }

      return [
        {
          type: "tag",
          name: template.name,
          args: template.token.args,
          children: [],
          trimLeft: template.token.trimLeft,
          trimRight: template.token.trimRight,
        },
      ];
    default:
      throw new Error(`Unsupported token kind: ${template.token.kind}`);
  }
}

/**
 * Extracts condition from a branch value
 */
function extractCondition(value) {
  if (!value || !value.initial || !value.initial.postfix) return null;
  // @ts-ignore
  return value.initial.postfix
    .flatMap((p) => p.props.map((prop) => prop.content))
    .join(".");
}
