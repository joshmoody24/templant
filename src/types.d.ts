export interface IrTextNode {
  type: "text";
  content: string;
}

export interface IrOutputNode {
  type: "output";
  filters: string[];
  postfix: string[];
}

export interface IrTagNode {
  type: "tag";
  name: string;
  attributes: Record<string, string>;
  children: IrNode[];
}

export type IrNode = IrTextNode | IrOutputNode | IrTagNode;

export type Parser = (content: string) => IrNode[];
export type Renderer = (ir: IrNode[]) => string;

export type BuiltInLanguage = "liquid";
