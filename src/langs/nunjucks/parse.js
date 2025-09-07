import nunjucks from "nunjucks";
import { IR_LOOP_VAR, LOOP_PROPERTY_MAP } from "../../ir-constants.js";

/**
 * Parses a Nunjucks template string and returns IR nodes
 * @type {Parser}
 */
export function parse(template) {
  const tokenizer = nunjucks.lexer.lex(template);
  const parser = new nunjucks.parser.Parser();
  parser.init(tokenizer, {});
  const ast = parser.parseAsRoot();
  return convertAstNodes(ast.children || [], template, { inLoop: false });
}

/**
 * Converts Nunjucks Ast nodes to IR nodes
 * @param {Array} nodes - Nunjucks Ast nodes
 * @param {string} originalTemplate - Original template string for literal extraction
 * @param {Object} context - Parsing context
 * @param {boolean} context.inLoop - Whether we're inside a loop
 * @returns {IrNode[]} IR nodes
 */
function convertAstNodes(nodes, originalTemplate, context = { inLoop: false }) {
  return nodes.flatMap((node) =>
    convertAstNode(node, originalTemplate, context),
  );
}

/**
 * Converts a single Nunjucks Ast node to IR
 * @param {Object} node - Nunjucks Ast node
 * @param {string} originalTemplate - Original template string for literal extraction
 * @param {Object} context - Parsing context
 * @param {boolean} context.inLoop - Whether we're inside a loop
 * @returns {IrNode[]} IR nodes
 */
function convertAstNode(node, originalTemplate, context = { inLoop: false }) {
  // Check if this is an Output node with TemplateData (text) or Symbol (variable)
  if (node.typename === "Output" && node.children?.length === 1) {
    const child = node.children[0];

    if (child.typename === "TemplateData") {
      // This is a text node
      return [
        {
          type: "text",
          content: child.value,
        },
      ];
    } else if (child.typename === "Symbol") {
      // This is a variable output node
      return [
        {
          type: "output",
          postfix: [child.value],
          filters: [],
          trimLeft: false,
          trimRight: false,
        },
      ];
    } else if (child.typename === "LookupVal") {
      // This is property access like user.name
      let postfix = [];
      if (child.target && child.val) {
        postfix = [child.target.value, child.val.value];
        // Normalize nunjucks loop variables to standard in IR when in loop context
        if (context.inLoop && postfix[0] === "loop") {
          postfix[0] = IR_LOOP_VAR;
          // Also normalize nunjucks-specific property names
          if (postfix[1] && LOOP_PROPERTY_MAP[postfix[1]]) {
            postfix[1] = LOOP_PROPERTY_MAP[postfix[1]];
          }
        }
      }

      return [
        {
          type: "output",
          postfix,
          filters: [],
          trimLeft: false,
          trimRight: false,
        },
      ];
    } else if (child.typename === "Literal") {
      // This is a literal value (number, string, etc.)
      let literalValue = child.value;

      // For string literals, try to extract the original format with quotes
      if (
        typeof child.value === "string" &&
        originalTemplate &&
        child.colno !== undefined
      ) {
        const extracted = extractStringLiteral(originalTemplate, child.colno);
        if (extracted) {
          literalValue = extracted;
        }
      }

      return [
        {
          type: "output",
          postfix: [literalValue],
          filters: [],
          trimLeft: false,
          trimRight: false,
        },
      ];
    } else if (child.typename === "Neg") {
      // This is a negative number
      return [
        {
          type: "output",
          postfix: [`-${child.target.value}`],
          filters: [],
          trimLeft: false,
          trimRight: false,
        },
      ];
    } else if (child.typename === "Filter") {
      // This is a filtered expression
      const baseExpression = extractPostfixFromNode(child.args.children[0]);
      const filters = [
        {
          name: child.name.value,
          args:
            child.args.children.length > 1
              ? child.args.children
                  .slice(1)
                  .map((arg) => extractLiteralValue(arg))
              : undefined,
        },
      ];

      return [
        {
          type: "output",
          postfix: baseExpression,
          filters,
          trimLeft: false,
          trimRight: false,
        },
      ];
    }
  }

  if (node.typename === "Set") {
    // This is a set/assignment node
    const target = node.targets.map((t) => t.value).join(", ");

    if (node.value) {
      // Inline assignment: {% set x = y %}
      const expression = extractComplexExpression(node.value);
      return [
        {
          type: "assignment",
          target,
          expression,
          trimLeft: false,
          trimRight: false,
        },
      ];
    } else if (node.body?.body?.children) {
      // Block assignment: {% set x %}...{% endset %}
      return [
        {
          type: "assignment",
          target,
          expression: "",
          children: convertAstNodes(
            node.body.body.children,
            originalTemplate,
            context,
          ),
          trimLeft: false,
          trimRight: false,
        },
      ];
    }

    // Fallback
    return [
      {
        type: "assignment",
        target,
        expression: "",
        trimLeft: false,
        trimRight: false,
      },
    ];
  }

  if (node.typename === "For") {
    // This is a for loop node
    return [
      {
        type: "loop",
        args: `${node.name.value} in ${node.arr.value}`,
        children: convertAstNodes(node.body?.children || [], originalTemplate, {
          ...context,
          inLoop: true,
        }),
        elseChildren: node.else_?.children
          ? convertAstNodes(node.else_.children, originalTemplate, {
              ...context,
              inLoop: true,
            })
          : undefined,
        trimLeft: false,
        trimRight: false,
      },
    ];
  }

  if (node.cond && node.body) {
    // This is a conditional node (if statement)
    const branches = [];

    // Main condition
    branches.push({
      condition: extractExpression(node.cond),
      children: convertAstNodes(
        node.body.children || [],
        originalTemplate,
        context,
      ),
    });

    // Handle elif branches
    if (node.elif_) {
      node.elif_.forEach((elifNode) => {
        branches.push({
          condition: extractExpression(elifNode.cond),
          children: convertAstNodes(
            elifNode.body.children || [],
            originalTemplate,
            context,
          ),
        });
      });
    }

    // Handle else branch
    if (node.else_) {
      branches.push({
        condition: null,
        children: convertAstNodes(
          node.else_.children || [],
          originalTemplate,
          context,
        ),
      });
    }

    return [
      {
        type: "conditional",
        variant: "if",
        branches,
        trimLeft: false,
        trimRight: false,
      },
    ];
  }

  // Default: try to process children if they exist
  if (node.children) {
    return convertAstNodes(node.children, originalTemplate, context);
  }

  // Unknown node type
  console.warn("Unknown nunjucks Ast node:", node);
  return [];
}

/**
 * Extracts expression text from a nunjucks expression node
 * @param {Object} expr - Nunjucks expression node
 * @returns {string} Expression as string
 */
function extractExpression(expr) {
  if (!expr) return "";

  if (expr.value !== undefined) {
    return expr.value;
  }

  if (expr.target && expr.val) {
    return `${expr.target.value}.${expr.val.value}`;
  }

  // For complex expressions, we might need more sophisticated handling
  return JSON.stringify(expr);
}

/**
 * Extracts postfix array from a nunjucks node
 * @param {Object} node - Nunjucks node
 * @returns {string[]} Postfix array for IR
 */
function extractPostfixFromNode(node) {
  if (!node) return [];

  if (node.typename === "Symbol") {
    return [node.value];
  }

  if (node.typename === "LookupVal" && node.target && node.val) {
    return [node.target.value, node.val.value];
  }

  if (node.typename === "Literal") {
    return [node.value];
  }

  // Default fallback
  return [node.value || "unknown"];
}

/**
 * Extracts literal value from a nunjucks node for filter arguments
 * @param {Object} node - Nunjucks node
 * @returns {string} Literal value as string
 */
function extractLiteralValue(node) {
  if (!node) return "";

  if (node.typename === "Literal") {
    return typeof node.value === "string"
      ? `"${node.value}"`
      : String(node.value);
  }

  if (node.value !== undefined) {
    return String(node.value);
  }

  return "unknown";
}

/**
 * Extracts complex expression from a nunjucks node (handles operators, etc.)
 * @param {Object} node - Nunjucks expression node
 * @returns {string} Expression as string
 */
function extractComplexExpression(node) {
  if (!node) return "";

  if (node.typename === "Add") {
    const left = extractComplexExpression(node.left);
    const right = extractComplexExpression(node.right);
    return `${left} + ${right}`;
  }

  if (node.typename === "Sub") {
    const left = extractComplexExpression(node.left);
    const right = extractComplexExpression(node.right);
    return `${left} - ${right}`;
  }

  if (node.typename === "Mul") {
    const left = extractComplexExpression(node.left);
    const right = extractComplexExpression(node.right);
    return `${left} * ${right}`;
  }

  if (node.typename === "Div") {
    const left = extractComplexExpression(node.left);
    const right = extractComplexExpression(node.right);
    return `${left} / ${right}`;
  }

  if (node.typename === "Symbol") {
    return node.value;
  }

  if (node.typename === "Literal") {
    return typeof node.value === "string"
      ? `"${node.value}"`
      : String(node.value);
  }

  if (node.typename === "LookupVal" && node.target && node.val) {
    return `${node.target.value}.${node.val.value}`;
  }

  // Fallback
  if (node.value !== undefined) {
    return String(node.value);
  }

  return "unknown";
}

/**
 * Extracts the original string literal from template text using position
 * @param {string} template - Original template string
 * @param {number} colno - Column number where the literal starts
 * @returns {string|null} Original string literal with quotes, or null if not found
 */
function extractStringLiteral(template, colno) {
  if (colno >= template.length) return null;

  const char = template[colno];
  if (char !== "'" && char !== '"') return null;

  const quote = char;
  let i = colno + 1;
  let result = quote;

  while (i < template.length) {
    const c = template[i];
    result += c;

    if (c === quote) {
      // End quote found
      return result;
    } else if (c === "\\") {
      // Escape sequence, skip next character
      i++;
      if (i < template.length) {
        result += template[i];
      }
    }
    i++;
  }

  // Unterminated string, return what we have
  return result;
}
