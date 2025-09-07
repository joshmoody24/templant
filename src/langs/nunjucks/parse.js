import nunjucks from "nunjucks";
import {
  IR_LOOP_VAR,
  IR_LOOP_REVINDEX,
  IR_FILTERS,
} from "../../ir-constants.js";

const NUNJUCKS_FILTERS_TO_IR = {
  upper: IR_FILTERS.UPPERCASE,
  lower: IR_FILTERS.LOWERCASE,
  trim: IR_FILTERS.TRIM,
};

const NUNJUCKS_LOOP_PROPERTIES_TO_IR = {
  revindex: IR_LOOP_REVINDEX,
};

/**
 * Factory functions for creating special IR filters from nunjucks filter args
 */
const NUNJUCKS_SPECIAL_FILTER_FACTORIES = {
  truncate: (args) => ({
    name: "truncate",
    length: args[0],
    killWords: args[1] && args[1].postfix[0] === true ? true : false,
    end: args[2] || undefined,
  }),

  replace: (args) => ({
    name: "replace",
    old: args[0],
    new: args[1],
    flags: args[2] || undefined,
  }),

  selectattr: (args) => ({
    name: "where",
    attribute: args[0],
    value: args[1] || undefined,
  }),

  sort: (args) => ({
    name: "sort",
    attribute: args[0] || undefined,
    reverse: args[1] && args[1].postfix[0] === true ? true : false,
  }),
};

const EMPTY_IR_EXPRESSION = {
  postfix: [],
  filters: [],
};

/**
 * Parses a Nunjucks template string and returns IR nodes
 * @type {Parser}
 */
export function parse(template) {
  const comments = [];
  const commentRegex = /{#(.*?)#}/gs;
  const processedTemplate = template.replace(commentRegex, (match, content) => {
    const placeholder = `{{ __COMMENT_${comments.length}__ }}`;
    comments.push(content.trim());
    return placeholder;
  });

  const tokenizer = nunjucks.lexer.lex(processedTemplate);
  const parser = new nunjucks.parser.Parser();
  parser.init(tokenizer, {});
  const ast = parser.parseAsRoot();
  return convertAstNodes(ast.children || [], processedTemplate, {
    inLoop: false,
    comments,
  });
}

/**
 * Converts Nunjucks Ast nodes to IR nodes
 * @param {Array} nodes - Nunjucks Ast nodes
 * @param {string} originalTemplate - Original template string for literal extraction
 * @param {Object} context - Parsing context
 * @param {boolean} context.inLoop - Whether we're inside a loop
 * @param {string[]} context.comments - Array of extracted comments
 * @returns {IrNode[]}
 */
function convertAstNodes(nodes, originalTemplate, context) {
  return nodes.flatMap((node) =>
    convertAstNode(node, originalTemplate, context),
  );
}

/**
 * Converts a single Nunjucks Ast node to IR
 * @param {Object} node - Nunjucks Ast node
 * @param {string} originalTemplate - Original template string for literal extraction
 * @param {Object} context - Parsing context
 * @returns {IrNode[]}
 */
function convertAstNode(node, originalTemplate, context) {
  if (
    node.typename === "Output" &&
    typeof node.children[0].value === "string" &&
    node.children[0].value?.includes("__COMMENT_")
  ) {
    const commentIndex = parseInt(
      node.children[0].value.split("__COMMENT_")[1],
    );
    return [
      {
        type: "comment",
        content: context.comments[commentIndex],
      },
    ];
  }

  // FIRST: Check if this is a raw block - nunjucks treats raw as special Output node
  if (node.typename === "Output" && node.children?.length === 1) {
    const child = node.children[0];
    if (
      child.typename === "TemplateData" &&
      typeof child.value === "string" &&
      child.colno !== undefined
    ) {
      // Check if this content is preceded by "{% raw %}" in the original template
      const precedingText = originalTemplate.slice(0, child.colno + 10);
      if (
        precedingText.includes("{% raw %}") ||
        precedingText.includes("{%raw%}")
      ) {
        return [
          {
            type: "raw",
            content: child.value,
            trimLeft: false,
            trimRight: false,
          },
        ];
      }
    }
  }

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
      const { trimLeft, trimRight } = extractWhitespaceControl(
        originalTemplate,
        child.colno,
      );
      return [
        {
          type: "output",
          expression: {
            postfix: [child.value],
            filters: [],
          },
          trimLeft,
          trimRight,
        },
      ];
    } else if (child.typename === "LookupVal") {
      // This is property access like user.name
      let postfix = buildPostfix(child, originalTemplate);

      // Normalize loop variables
      if (context.inLoop && postfix[0] === "loop") {
        postfix[0] = IR_LOOP_VAR;
        if (postfix[1] && NUNJUCKS_LOOP_PROPERTIES_TO_IR[postfix[1]]) {
          postfix[1] = NUNJUCKS_LOOP_PROPERTIES_TO_IR[postfix[1]];
        }
      }

      const { trimLeft, trimRight } = extractWhitespaceControl(
        originalTemplate,
        child.colno,
      );
      return [
        {
          type: "output",
          expression: {
            postfix,
            filters: [],
          },
          trimLeft,
          trimRight,
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

      const { trimLeft, trimRight } = extractWhitespaceControl(
        originalTemplate,
        child.colno,
      );
      return [
        {
          type: "output",
          expression: {
            postfix: [literalValue],
            filters: [],
          },
          trimLeft,
          trimRight,
        },
      ];
    } else if (child.typename === "Neg") {
      // This is a negative number
      const { trimLeft, trimRight } = extractWhitespaceControl(
        originalTemplate,
        child.colno,
      );
      return [
        {
          type: "output",
          expression: {
            postfix: [`-${child.target.value}`],
            filters: [],
          },
          trimLeft,
          trimRight,
        },
      ];
    } else if (child.typename === "Filter") {
      const expression = parseFilterChain(child, originalTemplate, context);
      const { trimLeft, trimRight } = extractWhitespaceControl(
        originalTemplate,
        child.colno,
      );
      return [
        {
          type: "output",
          expression,
          trimLeft,
          trimRight,
        },
      ];
    }
  }

  if (node.typename === "Set") {
    // This is a set/assignment node
    const target = node.targets.map((t) => t.value).join(", ");

    if (node.value) {
      // Inline assignment: {% set x = y %}
      const expressionIr = convertNunjucksExpressionToIrExpression(
        node.value,
        originalTemplate,
        context,
      );

      const { trimLeft, trimRight } = extractWhitespaceControl(
        originalTemplate,
        node.colno || 0,
      );

      return [
        {
          type: "assignment",
          target,
          expression: expressionIr,
          trimLeft,
          trimRight,
        },
      ];
    } else if (node.body?.body?.children) {
      // Block assignment: {% set x %}...{% endset %}
      const { trimLeft, trimRight } = extractWhitespaceControl(
        originalTemplate,
        node.colno || 0,
      );

      return [
        {
          type: "assignment",
          target,
          expression: null,
          children: convertAstNodes(
            node.body.body.children,
            originalTemplate,
            context,
          ),
          trimLeft,
          trimRight,
        },
      ];
    }

    // Fallback
    return [
      {
        type: "assignment",
        target,
        expression: null,
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
        args: {
          variable: node.name.value,
          collection: convertNunjucksExpressionToIrExpression(
            node.arr,
            originalTemplate,
            context,
          ),
        },
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
        ...extractWhitespaceControl(originalTemplate, node.colno || 0),
      },
    ];
  }

  if (node.cond && node.body) {
    // This is a conditional node (if statement)
    const branches = [];
    let current = node;

    // Loop through if/elif chain
    while (current && current.cond) {
      branches.push({
        condition: convertNunjucksExpressionToIrExpression(
          current.cond,
          originalTemplate,
          context,
        ),
        children: convertAstNodes(
          current.body.children || [],
          originalTemplate,
          context,
        ),
      });
      current = current.else_;
    }

    // Handle final else branch
    if (current) {
      branches.push({
        condition: null,
        children: convertAstNodes(
          current.children || [],
          originalTemplate,
          context,
        ),
      });
    }

    const firstBranchCondition = branches[0].condition;
    const isUnless = firstBranchCondition.filters.some(
      (f) => f.name === IR_FILTERS.LOGICAL_NOT,
    );
    let variant = "if";

    if (isUnless && branches.length === 1) {
      variant = "unless";
      branches[0].condition.filters = branches[0].condition.filters.filter(
        (f) => f.name !== IR_FILTERS.LOGICAL_NOT,
      );
    } else if (
      isUnless &&
      branches.length === 2 &&
      branches[1].condition === null &&
      branches[1].children.length === 0
    ) {
      // This handles `unless ... else %}{% endunless` which is not valid liquid
      // but nunjucks allows it. For now, we convert to if.
      // To be a true unless, there should be no `else`.
      variant = "unless";
      branches[0].condition.filters = branches[0].condition.filters.filter(
        (f) => f.name !== IR_FILTERS.LOGICAL_NOT,
      );
      branches.pop();
    }

    const { trimLeft, trimRight } = extractWhitespaceControl(
      originalTemplate,
      node.colno || 0,
    );

    return [
      {
        type: "conditional",
        variant,
        branches,
        trimLeft,
        trimRight,
      },
    ];
  }

  // Handle include statements (doesn't have typename but has template property)
  if (
    node.template &&
    node.template.value &&
    node.ignoreMissing !== undefined
  ) {
    const templateValue = node.template.value;
    const { trimLeft, trimRight } = extractWhitespaceControl(
      originalTemplate,
      node.colno,
    );

    return [
      {
        type: "include",
        template: {
          postfix: [`'${templateValue}'`],
          filters: [],
        },
        trimLeft,
        trimRight,
      },
    ];
  }

  // Default: try to process children if they exist
  if (node.children) {
    return convertAstNodes(node.children, originalTemplate, context);
  }

  // Handle standalone expression nodes (Filter, Symbol, etc.) that should be outputs
  const expressionNodeTypes = [
    "Filter",
    "Symbol",
    "Literal",
    "Add",
    "Sub",
    "Mul",
    "Div",
    "Mod",
  ];
  if (expressionNodeTypes.includes(node.typename)) {
    const { trimLeft, trimRight } = extractWhitespaceControl(
      originalTemplate,
      node.colno || 0,
    );
    const expression = convertNunjucksExpressionToIrExpression(
      node,
      originalTemplate,
      context,
    );

    return [
      {
        type: "output",
        expression,
        trimLeft,
        trimRight,
      },
    ];
  }

  // Unknown node type
  console.warn("Unknown nunjucks Ast node:", node.typename, node);
  return [];
}

function buildPostfix(node, originalTemplate) {
  if (!node) return [];
  if (node.typename === "Symbol") {
    return [node.value];
  }
  if (node.typename === "LookupVal") {
    return [...buildPostfix(node.target, originalTemplate), node.val.value];
  }
  if (node.typename === "Literal") {
    // For string literals, try to preserve original format with quotes
    if (
      typeof node.value === "string" &&
      originalTemplate &&
      node.colno !== undefined
    ) {
      const extracted = extractStringLiteral(originalTemplate, node.colno);
      if (extracted) {
        return [extracted];
      }
    }
    return [node.value];
  }
  return [];
}

function parseFilterChain(node, originalTemplate, context) {
  if (node.typename !== "Filter") {
    return { postfix: buildPostfix(node, originalTemplate), filters: [] };
  }

  const { postfix, filters } = parseFilterChain(
    node.args.children[0],
    originalTemplate,
    context,
  );
  const filterName = node.name.value;
  const irFilterName = NUNJUCKS_FILTERS_TO_IR[filterName] || filterName;

  const args =
    node.args.children.length > 1
      ? node.args.children
          .slice(1)
          .map((arg) =>
            convertNunjucksExpressionToIrExpression(
              arg,
              originalTemplate,
              context,
            ),
          )
      : [];

  // Handle special filters using factory functions
  const factory = NUNJUCKS_SPECIAL_FILTER_FACTORIES[filterName];
  if (factory) {
    // Check if we have named arguments (KeywordArgs)
    const rawArgs = node.args.children.slice(1);
    if (
      rawArgs.length > 0 &&
      rawArgs[0].children &&
      rawArgs[0].children[0]?.key
    ) {
      // Handle named arguments
      const namedArgs = rawArgs[0].children;
      const processedArgs = {};

      namedArgs.forEach((namedArg) => {
        const key = namedArg.key.value;
        const value = convertNunjucksExpressionToIrExpression(
          namedArg.value,
          originalTemplate,
          context,
        );
        processedArgs[key] = value;
      });

      // Create special filter from named arguments
      if (filterName === "sort") {
        const specialFilter = {
          name: "sort",
          attribute: processedArgs.attribute || undefined,
          reverse: processedArgs.reverse === "true" ? true : false,
        };
        return { postfix, filters: [...filters, specialFilter] };
      } else if (filterName === "selectattr") {
        const specialFilter = {
          name: "where",
          attribute: processedArgs.attribute || args[0],
          value: processedArgs.value || args[1] || undefined,
        };
        return { postfix, filters: [...filters, specialFilter] };
      }
    }

    // Fallback to positional arguments
    const specialFilter = factory(args);
    return { postfix, filters: [...filters, specialFilter] };
  }

  // Regular filter
  const newFilter = {
    name: irFilterName,
    args: args.length > 0 ? args : undefined,
  };

  return { postfix, filters: [...filters, newFilter] };
}

function convertNunjucksExpressionToIrExpression(
  expressionNode,
  originalTemplate,
  context,
) {
  if (!expressionNode) {
    // Add this check
    return EMPTY_IR_EXPRESSION;
  }
  if (expressionNode.typename === "Filter") {
    const { postfix, filters } = parseFilterChain(
      expressionNode,
      originalTemplate,
      context,
    );
    return {
      postfix,
      filters,
    };
  }

  if (
    expressionNode.typename === "Add" ||
    expressionNode.typename === "Sub" ||
    expressionNode.typename === "Mul" ||
    expressionNode.typename === "Div" ||
    expressionNode.typename === "Mod"
  ) {
    const opMap = {
      Add: IR_FILTERS.ADD,
      Sub: IR_FILTERS.SUBTRACT,
      Mul: IR_FILTERS.MULTIPLY,
      Div: IR_FILTERS.DIVIDE,
      Mod: IR_FILTERS.MODULO,
    };
    const leftExpression = convertNunjucksExpressionToIrExpression(
      expressionNode.left,
      originalTemplate,
      context,
    );
    const rightExpression = convertNunjucksExpressionToIrExpression(
      expressionNode.right,
      originalTemplate,
      context,
    );

    const newFilter = {
      name: opMap[expressionNode.typename],
      args: [rightExpression], // Pass IrExpression directly
    };

    return {
      postfix: leftExpression.postfix,
      filters: [...leftExpression.filters, newFilter],
    };
  }

  if (expressionNode.typename === "Compare") {
    const leftExpression = convertNunjucksExpressionToIrExpression(
      expressionNode.expr,
      originalTemplate,
      context,
    );
    const rightExpression = convertNunjucksExpressionToIrExpression(
      expressionNode.ops[0].expr,
      originalTemplate,
      context,
    );
    const opMap = {
      "==": IR_FILTERS.COMPARE_EQ,
      "!=": IR_FILTERS.COMPARE_NE,
      ">": IR_FILTERS.COMPARE_GT,
      ">=": IR_FILTERS.COMPARE_GTE,
      "<": IR_FILTERS.COMPARE_LT,
      "<=": IR_FILTERS.COMPARE_LTE,
    };
    const op = opMap[expressionNode.ops[0].type] || expressionNode.ops[0].type;

    return {
      postfix: leftExpression.postfix,
      filters: [
        ...leftExpression.filters,
        { name: op, args: [rightExpression] },
      ],
    };
  }

  if (
    expressionNode.typename === "And" ||
    expressionNode.typename === "Or" ||
    expressionNode.typename === "Xor"
  ) {
    const opMap = {
      And: IR_FILTERS.LOGICAL_AND,
      Or: IR_FILTERS.LOGICAL_OR,
      Xor: "xor",
    }; // Xor is not in IR_FILTERS
    const leftExpression = convertNunjucksExpressionToIrExpression(
      expressionNode.left,
      originalTemplate,
      context,
    );
    const rightExpression = convertNunjucksExpressionToIrExpression(
      expressionNode.right,
      originalTemplate,
      context,
    );

    return {
      postfix: leftExpression.postfix,
      filters: [
        ...leftExpression.filters,
        { name: opMap[expressionNode.typename], args: [rightExpression] },
      ],
    };
  }

  if (expressionNode.typename === "Not") {
    const targetExpression = convertNunjucksExpressionToIrExpression(
      expressionNode.target,
      originalTemplate,
      context,
    );
    return {
      postfix: targetExpression.postfix,
      filters: [
        ...targetExpression.filters,
        { name: IR_FILTERS.LOGICAL_NOT, args: [] },
      ],
    };
  }

  // Default case for simple values (Symbol, Literal, LookupVal, Neg)
  return {
    postfix: buildPostfix(expressionNode, originalTemplate),
    filters: [],
  };
}

/**
 * Extracts whitespace control information from template
 * @param {string} template - Original template string
 * @param {number} startCol - Start column of the output node
 * @returns {{trimLeft: boolean, trimRight: boolean}}
 */
function extractWhitespaceControl(template, startCol) {
  // Find the start of the output expression by looking backwards from startCol
  let searchStart = Math.max(0, startCol - 10);
  let varStart = -1;
  let varEnd = -1;

  // Look for {{ or {%
  for (let i = searchStart; i < template.length - 1; i++) {
    if (
      template[i] === "{" &&
      (template[i + 1] === "{" || template[i + 1] === "%")
    ) {
      varStart = i;
      break;
    }
  }

  if (varStart === -1) return { trimLeft: false, trimRight: false };

  // Find the end }} or %}
  for (let i = varStart + 2; i < template.length - 1; i++) {
    if (
      (template[i] === "}" || template[i] === "%") &&
      template[i + 1] === "}"
    ) {
      varEnd = i + 2;
      break;
    }
  }

  if (varEnd === -1) return { trimLeft: false, trimRight: false };

  // Extract the full tag
  const tag = template.slice(varStart, varEnd);

  // Check for trim markers
  const trimLeft = tag.startsWith("{{-") || tag.startsWith("{%-");
  const trimRight = tag.endsWith("-}}") || tag.endsWith("-%}");

  return { trimLeft, trimRight };
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
