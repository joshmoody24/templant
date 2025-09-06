declare global {
  interface IrTextNode {
    type: "text";
    content: string;
  }

  interface IrExpressionNode {
    type: "output";
    filters: string[];
    postfix: string[];
  }

  interface IrTagNode {
    type: "tag";
    name: string;
    attributes: Record<string, string>;
    children: IrNode[];
  }

  type IrNode = IrTextNode | IrExpressionNode | IrTagNode;

  type Parser = (content: string) => IrNode[];
  type Renderer = (ir: IrNode[]) => string;

  type BuiltInLanguage = "liquid";
  // | "nunjucks"
  // | "ejs"
  // | "handlebars"
  // | "mustache"
  // | "pug";
}

export {};
