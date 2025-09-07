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
  postfix: string[];
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

export type IrNode =
  | IrTextNode
  | IrOutputNode
  | IrTagNode
  | IrConditionalNode
  | IrLoopNode
  | IrCommentNode;

export type Parser = (content: string) => IrNode[];
export type Renderer = (ir: IrNode[]) => string;

export type BuiltInLanguage = "liquid";
