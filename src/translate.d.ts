export type TemplateLanguage =
  | "nunjucks"
  | "ejs"
  | "handlebars"
  | "liquid"
  | "mustache"
  | "pug";

export interface TranslateOptions {
  from: TemplateLanguage;
  to: TemplateLanguage;
  input: string;
}

export function translate(options: TranslateOptions): string;

