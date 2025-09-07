import type * as Types from "./types";

declare global {
  type IrTextNode = Types.IrTextNode;
  type IrOutputNode = Types.IrOutputNode;
  type IrTagNode = Types.IrTagNode;
  type IrConditionalNode = Types.IrConditionalNode;
  type IrLoopNode = Types.IrLoopNode;
  type IrCommentNode = Types.IrCommentNode;
  type IrNode = Types.IrNode;
  type Parser = Types.Parser;
  type Renderer = Types.Renderer;
  type BuiltInLanguage = Types.BuiltInLanguage;
}

export {};
