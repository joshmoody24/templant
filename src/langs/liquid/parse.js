import { Liquid, TokenKind } from "liquidjs";
import {
  IR_LOOP_VAR,
  IR_LOOP_REVINDEX,
  IR_FILTERS,
} from "../../ir-constants.js";

const LIQUID_FILTERS_TO_IR = {
  upcase: IR_FILTERS.UPPERCASE,
  downcase: IR_FILTERS.LOWERCASE,
  strip: IR_FILTERS.TRIM,
  plus: IR_FILTERS.ADD,
  minus: IR_FILTERS.SUBTRACT,
  times: IR_FILTERS.MULTIPLY,
  divided_by: IR_FILTERS.DIVIDE,
  modulo: IR_FILTERS.MODULO,
};

const LIQUID_OPERATORS_TO_IR = {
  ">=": IR_FILTERS.COMPARE_GTE,
  "<=": IR_FILTERS.COMPARE_LTE,
  ">": IR_FILTERS.COMPARE_GT,
  "<": IR_FILTERS.COMPARE_LT,
  "==": IR_FILTERS.COMPARE_EQ,
  "!=": IR_FILTERS.COMPARE_NE,
  and: IR_FILTERS.LOGICAL_AND,
  or: IR_FILTERS.LOGICAL_OR,
  contains: IR_FILTERS.CONTAINS,
};

const LIQUID_LOOP_PROPERTIES_TO_IR = {
  rindex: IR_LOOP_REVINDEX,
};

/**
 * Factory functions for creating special IR filters from liquid filter args
 */
const LIQUID_SPECIAL_FILTER_FACTORIES = {
  truncate: (args) => ({
    name: "truncate",
    length: args[0],
    end: args[1] || undefined,
    killWords: true,
  }),

  replace: (args) => ({
    name: "replace",
    old: args[0],
    new: args[1],
    flags: args[2] || undefined,
  }),

  where: (args) => ({
    name: "where",
    attribute: args[0],
    value: args[1] || undefined,
  }),

  sort: (args) => ({
    name: "sort",
    attribute: args[0],
  }),
};

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
 * Process a single postfix item into an IrExpression
 */
function processPostfixItem(p, context, template) {
  const postfixParts = [];

  if (p.props) {
    // Property access like user.name
    const props = p.props.map((prop) => prop.content);
    // Normalize liquid forloop to standard loop variable in IR when in loop context
    if (context.inLoop && props[0] === "forloop") {
      props[0] = IR_LOOP_VAR;
      // Also normalize liquid-specific property names
      if (props[1] && LIQUID_LOOP_PROPERTIES_TO_IR[props[1]]) {
        props[1] = LIQUID_LOOP_PROPERTIES_TO_IR[props[1]];
      }
    }
    postfixParts.push(...props);
  } else if (p.literal !== undefined) {
    // Special literals like null, blank, empty
    // Convert special literals to standardized values
    if (p.literal === "null") postfixParts.push(null);
    else if (p.literal === "blank") postfixParts.push("");
    else postfixParts.push(p.literal);
  } else if (p.content !== undefined) {
    // Other literals like 'string', 42
    if (p.kind === TokenKind.Quoted) {
      // String literal - preserve original format from input
      const original = template.token.input.slice(p.begin, p.end);
      postfixParts.push(original);
    } else {
      postfixParts.push(p.content);
    }
  }

  return {
    postfix: postfixParts,
    filters: [],
  };
}

/**
 * Converts a Liquid value object to an IrExpression
 * @param {Object} value - The Liquid value object with filters and initial.postfix
 * @param {Object} context - Parsing context
 * @param {Object} template - The template object for accessing token input
 * @returns {IrExpression} The IrExpression
 */
function valueToExpression(value, context, template) {
  if (!value) return null;

  // Convert filters
  const filters = (value.filters || []).map((f) => {
    const filterName = LIQUID_FILTERS_TO_IR[f.name] || f.name;
    const args = f.args
      ? f.args.map((arg) => {
          // Preserve original format from input string for quoted args
          if (arg.kind === TokenKind.Quoted) {
            const original = template.token.input.slice(arg.begin, arg.end);
            return {
              postfix: [original],
              filters: [],
            };
          } else if (typeof arg.content !== "undefined") {
            return {
              postfix: [arg.content],
              filters: [],
            };
          }
          // Fallback: preserve original format from input string
          const original = template.token.input.slice(arg.begin, arg.end);
          return {
            postfix: [original],
            filters: [],
          };
        })
      : [];

    // Try to create special filter, fallback to regular filter
    const factory = LIQUID_SPECIAL_FILTER_FACTORIES[f.name];
    return factory
      ? factory(args)
      : {
          name: filterName,
          args: args.length > 0 ? args : undefined,
        };
  });

  // Convert postfix, handling operators as filters
  // The Liquid AST uses postfix notation: [left, right, operator]
  // e.g. "user.age >= 18" becomes [user.age, 18, >=]
  // Complex: "a >= b and c" becomes [a, b, >=, c, and]

  if (value.initial && value.initial.postfix) {
    const postfixArray = value.initial.postfix;

    // Use a stack to process postfix notation
    const stack = [];

    for (let i = 0; i < postfixArray.length; i++) {
      const item = postfixArray[i];

      if (item.operator) {
        // This is an operator - pop two operands from stack and create filter
        const filterName =
          LIQUID_OPERATORS_TO_IR[item.operator] || item.operator;

        // In postfix, the right operand is on top of stack
        const right = stack.pop();
        const left = stack.pop() || { postfix: [""], filters: [] };

        // Create expression with operator as filter
        const result = {
          postfix: left.postfix,
          filters: [
            ...left.filters,
            {
              name: filterName,
              args: right ? [right] : [],
            },
          ],
        };

        stack.push(result);
      } else {
        // This is an operand - convert and push to stack
        const expr = processPostfixItem(item, context, template);
        stack.push(expr);
      }
    }

    // Final result is on top of stack
    const finalExpr = stack[0] || { postfix: [""], filters: [] };

    return {
      postfix: finalExpr.postfix,
      filters: [...filters, ...finalExpr.filters],
    };
  }

  return {
    postfix: [""],
    filters: filters,
  };
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
          expression: valueToExpression(template.value, context, template),
          trimLeft: template.token.trimLeft,
          trimRight: template.token.trimRight,
        },
      ];
    case TokenKind.Tag:
      // @ts-ignore
      if (template.branches) {
        let branches;

        if (template.name === "case") {
          const caseExpression = valueToExpression(
            template.value,
            context,
            template,
          );
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
            // Create an IrExpression for when values
            const whenCondition = whenValues
              ? {
                  postfix: [whenValues],
                  filters: [],
                }
              : null;
            branches.push({
              condition: whenCondition,
              children: branch.templates
                ? branch.templates.flatMap((t) => convertTemplate(t, context))
                : [],
            });
          });
        } else {
          branches = template.branches.map((branch, index) => ({
            condition: valueToExpression(branch.value, context, template),
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
              expression: null, // Block assignment has no expression
              children: template.templates.flatMap((t) =>
                convertTemplate(t, context),
              ),
              trimLeft: template.token.trimLeft,
              trimRight: template.token.trimRight,
            },
          ];
        }

        // Parse loop args into variable and collection
        const loopArgs = template.token.args || "";
        const [variable, ...collectionParts] = loopArgs
          .split(" in ")
          .map((s) => s.trim());
        const collectionString = collectionParts.join(" in ");

        // Parse the collection as an expression
        const liquid = new Liquid();
        let collectionExpression;
        try {
          const parsed = liquid.parse(`{{ ${collectionString} }}`)[0];
          const outputIr = convertTemplate(parsed, context)[0];
          collectionExpression = outputIr.expression;
        } catch (e) {
          // Fallback to simple expression
          collectionExpression = {
            postfix: [collectionString],
            filters: [],
          };
        }

        return [
          {
            type: "loop",
            args: {
              variable: variable,
              collection: collectionExpression,
            },
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
        const expressionString = expressionParts.join("=").trim();

        const liquid = new Liquid();
        const expressionAst = liquid.parse(`{{ ${expressionString} }}`)[0];
        const expressionIr = convertTemplate(expressionAst, context)[0];

        return [
          {
            type: "assignment",
            target: target || "",
            expression: expressionIr.expression, // Extract the expression from the output node
            trimLeft: template.token.trimLeft,
            trimRight: template.token.trimRight,
          },
        ];
      }

      if (template.name === "include") {
        const args = template.token.args || "";

        // Parse the template name as an expression
        const liquid = new Liquid();
        const templateAst = liquid.parse(`{{ ${args} }}`)[0];
        const templateIr = convertTemplate(templateAst, context)[0];

        return [
          {
            type: "include",
            template: templateIr.expression,
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
