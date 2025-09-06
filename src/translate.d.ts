import { Parser, Renderer } from "./langs";

export type BuiltInLanguage = "liquid";
// | "nunjucks"
// | "ejs"
// | "handlebars"
// | "mustache"
// | "pug";

export interface TranslateArgs<
  CustomParsers extends Record<string, Parser> = {},
  CustomRenderers extends Record<string, Renderer> = {},
> {
  from: BuiltInLanguage | Extract<keyof CustomParsers, string>;
  to: BuiltInLanguage | Extract<keyof CustomRenderers, string>;
  input: string;
  customParsers?: CustomParsers;
  customRenderers?: CustomRenderers;
}

export function translate<
  CustomParsers extends Record<string, Parser>,
  CustomRenderers extends Record<string, Renderer>,
>(options: TranslateArgs<CustomParsers, CustomRenderers>): string;
