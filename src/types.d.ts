/**
 * Common Intermediate Representation (IR) for template languages.
 */

/**
 * A map of language-specific filter names to a common IR representation.
 */
export type FilterMap = {
  [key: string]: string;
};

/**
 * A function that takes a template string and returns an array of IR nodes.
 */
export type Parser = (template: string) => IrNode[];

/**
 * A function that takes an array of IR nodes and returns a template string.
 */
export type Renderer = (ir: IrNode[]) => string;

/**
 * A node in the IR tree.
 */
export type IrNode =
  | IrTextNode
  | IrOutputNode
  | IrConditionalNode
  | IrLoopNode
  | IrTagNode
  | IrCommentNode
  | IrAssignmentNode
  | IrRawNode
  | IrIncludeNode;

/**
 * Base interface for IR nodes that support whitespace control.
 */
export interface IrBaseNode {
  trimLeft: boolean;
  trimRight: boolean;
}

/**
 * A static text node.
 */
export type IrTextNode = {
  type: "text";
  content: string;
};

/**
 * Represents an expression in the IR. E.g., (1 | add: 1).
 * Some examples:
 * ["object", "foo"] means "object.foo"
 * ["array", 0] means "array[0]"
 * [null] means the literal null
 * [1] means the literal 1
 * ['"word"'] means the literal "word"
 *
 */
export type IrExpression = {
  postfix: (string | number)[] | [null];
  filters: IrFilter[];
};

/**
 * A node that outputs a value, e.g., {{ name }}.
 * Now contains an IrExpression.
 */
export type IrOutputNode = IrBaseNode & {
  type: "output";
  expression: IrExpression;
};

/**
 * Special filter for truncate with normalized arguments.
 * Different engines have different signatures:
 * - Nunjucks: truncate(length, killWords, end)
 * - Liquid: truncate: length, end
 */
export type IrTruncateFilter = {
  name: "truncate";
  length: IrExpression;
  end?: IrExpression;
  killWords?: boolean; // Only relevant for engines that support it
};

/**
 * Special filter for replace with normalized arguments.
 * Different engines may have different signatures:
 * - Most: replace(old, new)
 * - Some: replace(old, new, flags)
 */
export type IrReplaceFilter = {
  name: "replace";
  old: IrExpression;
  new: IrExpression;
  flags?: IrExpression; // For engines that support regex flags
};

/**
 * Special filter for where/selectattr with normalized arguments.
 * Universal filter for attribute-based filtering:
 * - Liquid: where('attr', 'value')
 * - Nunjucks: selectattr('attr') for truthiness, selectattr('attr', 'value') for equality
 */
export type IrWhereFilter = {
  name: "where";
  attribute: IrExpression;
  value?: IrExpression; // If undefined, checks for truthiness
};

/**
 * Special filter for sort with normalized arguments.
 * Nunjucks: sort(attribute='field_name') or sort(reverse=true)
 */
export type IrSortFilter = {
  name: "sort";
  attribute?: IrExpression; // Field to sort by
  reverse?: boolean; // Sort direction
};

/**
 * Union type for all special filters that need custom argument handling.
 */
export type IrSpecialFilter =
  | IrTruncateFilter
  | IrReplaceFilter
  | IrWhereFilter
  | IrSortFilter;

/**
 * A filter applied to an expression.
 */
export type IrFilter =
  | {
      name: string;
      args?: IrExpression[];
    }
  | IrSpecialFilter;

/**
 * A conditional node, e.g., {% if %}, {% case %}, {% unless %}.
 */
export type IrConditionalNode = IrBaseNode & {
  type: "conditional";
  variant: "if" | "case" | "unless";
  branches: IrBranch[];
};

/**
 * A branch in a conditional node, e.g., {% if %}, {% elsif %}, {% else %}.
 */
export type IrBranch = {
  condition: IrExpression | null;
  children: IrNode[];
};

/**
 * Arguments for a loop node.
 */
export type IrLoopArgs = {
  variable: string;
  collection: IrExpression;
};

/**
 * A loop node, e.g., {% for %}.
 */
export type IrLoopNode = IrBaseNode & {
  type: "loop";
  args: IrLoopArgs;
  children: IrNode[];
  elseChildren?: IrNode[];
};

/**
 * A generic tag node for unhandled tags.
 */
export type IrTagNode = IrBaseNode & {
  type: "tag";
  name: string;
  args: string;
  children: IrNode[];
};

/**
 * A comment node.
 */
export type IrCommentNode = {
  type: "comment";
  content: string;
};

/**
 * Assignment of a value to a variable, e.g., {% assign x = y %}
 */
export type IrAssignmentNode = IrBaseNode & {
  type: "assignment";
  target: string;
  /**
   * The expression to assign. If null, this is a block assignment,
   * e.g., {% capture x %}...{% endcapture %}
   */
  expression: IrExpression | null;
  children?: IrNode[];
};

/**
 * Raw content node that should not be processed.
 */
export type IrRawNode = IrBaseNode & {
  type: "raw";
  content: string;
};

/**
 * Include node for template composition.
 */
export type IrIncludeNode = IrBaseNode & {
  type: "include";
  template: IrExpression;
  context?: IrExpression; // For engines that support passing context
};

/**
 * Built-in template languages supported by the library.
 */
export type BuiltInLanguage = "liquid" | "nunjucks";
