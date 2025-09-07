export interface IrTextNode {
  type: "text";
  content: string;
}

export interface IrOutputNode {
  type: "output";
  filters: {
    name: string;
    args?: string[];
  }[];
  // postfix array represents property access chain and literals
  // null represents the literal null value (e.g., {{ null }})
  // strings represent variable names, property names, or other literals
  // numbers represent array indices (e.g., items[0])
  postfix: (string | number | null)[];
  trimLeft?: boolean;
  trimRight?: boolean;
}

export interface IrTagNode {
  type: "tag";
  name: string;
  args?: string;
  children: IrNode[];
  trimLeft?: boolean;
  trimRight?: boolean;
}

export interface IrConditionalNode {
  type: "conditional";
  variant: "if" | "case" | "unless";
  branches: {
    condition: string | null;
    children: IrNode[];
  }[];
  trimLeft?: boolean;
  trimRight?: boolean;
}

export interface IrLoopNode {
  type: "loop";
  args: string;
  children: IrNode[];
  elseChildren?: IrNode[];
  trimLeft?: boolean;
  trimRight?: boolean;
}

export interface IrCommentNode {
  type: "comment";
  content: string;
}

export interface IrAssignmentNode {
  type: "assignment";
  target: string;
  expression: string;
  children?: IrNode[]; // For block assignments like capture
  trimLeft?: boolean;
  trimRight?: boolean;
}

export interface IrRawNode {
  type: "raw";
  content: string;
  trimLeft?: boolean;
  trimRight?: boolean;
}

export type IrNode =
  | IrTextNode
  | IrOutputNode
  | IrTagNode
  | IrConditionalNode
  | IrLoopNode
  | IrCommentNode
  | IrAssignmentNode
  | IrRawNode;

export type Parser = (content: string) => IrNode[];
export type Renderer = (ir: IrNode[]) => string;

export type BuiltInLanguage = "liquid" | "nunjucks";
