import { Liquid, TokenKind } from "liquidjs";
import { IR_LOOP_VAR, LOOP_PROPERTY_MAP } from "../../ir-constants.js";

/**
 * Parses a Liquid template string and returns the first token of the parsed template.
 * @type {Parser}
 */
export function parse(template) {
  const liquid = new Liquid();
  const templates = liquid.parse(template);
  return templates.flatMap((t) => convertTemplate(t, { inLoop: false }));
}

/**
 * Converts a Liquid token to an intermediate representation (IR) node.
 * @param {import("liquidjs").Template} template - The Liquid token to convert.
 * @param {Object} context - Parsing context
 * @param {boolean} context.inLoop - Whether we're inside a loop
 * @returns {IrNode[]} The corresponding IR nodes.
 */
function convertTemplate(template, context = { inLoop: false }) {
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
              const props = p.props.map((prop) => prop.content);
              // Normalize liquid forloop to standard loop variable in IR when in loop context
              if (context.inLoop && props[0] === "forloop") {
                props[0] = IR_LOOP_VAR;
                // Also normalize liquid-specific property names
                if (props[1] && LOOP_PROPERTY_MAP[props[1]]) {
                  props[1] = LOOP_PROPERTY_MAP[props[1]];
                }
              }
              return props;
            } else if (p.literal !== undefined) {
              // Special literals like null, blank, empty
              // Convert special literals to standardized values
              if (p.literal === "null") return [null];
              if (p.literal === "blank") return [""];
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
                ? branch.templates.flatMap((t) => convertTemplate(t, context))
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
              ? branch.templates.flatMap((t) => convertTemplate(t, context))
              : [],
          }));
        }

        if (template.elseTemplates && template.elseTemplates.length > 0) {
          branches.push({
            condition: null,
            children: template.elseTemplates.flatMap((t) =>
              convertTemplate(t, context),
            ),
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
              type: "assignment",
              target: template.token.args,
              expression: "", // Block assignment has no expression
              children: template.templates.flatMap((t) =>
                convertTemplate(t, context),
              ),
              trimLeft: template.token.trimLeft,
              trimRight: template.token.trimRight,
            },
          ];
        }

        return [
          {
            type: "loop",
            args: template.token.args,
            children: template.templates.flatMap((t) =>
              convertTemplate(t, { ...context, inLoop: true }),
            ),
            elseChildren:
              template.elseTemplates && template.elseTemplates.length > 0
                ? template.elseTemplates.flatMap((t) =>
                    convertTemplate(t, { ...context, inLoop: true }),
                  )
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
            type: "raw",
            content: content,
            trimLeft: template.token.trimLeft,
            trimRight: template.token.trimRight,
          },
        ];
      }

      if (template.name === "assign") {
        const args = template.token.args || "";
        const [target, ...expressionParts] = args
          .split("=")
          .map((s) => s.trim());
        const expression = expressionParts.join("=").trim();

        return [
          {
            type: "assignment",
            target: target || "",
            expression: expression || "",
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
