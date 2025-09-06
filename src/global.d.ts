import type * as Types from "./types";

declare global {
  type IrTextNode = Types.IrTextNode;
  type IrExpressionNode = Types.IrExpressionNode;
  type IrTagNode = Types.IrTagNode;
  type IrNode = Types.IrNode;
  type Parser = Types.Parser;
  type Renderer = Types.Renderer;
  type BuiltInLanguage = Types.BuiltInLanguage;
}

export {};
