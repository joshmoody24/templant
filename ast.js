#!/usr/bin/env node

import { Liquid } from "liquidjs";
import nunjucks from "nunjucks";
import { parse as liquidParse } from "./src/langs/liquid/parse.js";
import { parse as nunjucksParse } from "./src/langs/nunjucks/parse.js";

const [template, language = "liquid"] = process.argv.slice(2);

if (!template) {
  console.error("Usage: node ast.js <template> [language]");
  console.error("Example: node ast.js 'Hello {{ name }}' liquid");
  process.exit(1);
}

if (!["liquid", "nunjucks"].includes(language)) {
  console.error("Supported languages: liquid, nunjucks");
  process.exit(1);
}

if (language === "nunjucks") {
  console.log("=== Nunjucks Tokens ===");
  const lexer = nunjucks.lexer.lex(template);
  let token;
  while ((token = lexer.nextToken())) {
    console.log(JSON.stringify(token, null, 2));
  }
}

console.log("=== Real AST ===");
if (language === "liquid") {
  const liquid = new Liquid();
  const realAst = liquid.parse(template);
  console.log(
    JSON.stringify(
      realAst,
      (key, value) => {
        if (key === "liquid" || key === "parser") return "[Circular]";
        return value;
      },
      2,
    ),
  );
} else if (language === "nunjucks") {
  try {
    const tokenizer = nunjucks.lexer.lex(template);
    const parser = new nunjucks.parser.Parser();
    parser.init(tokenizer, {});
    const ast = parser.parseAsRoot();
    console.log(JSON.stringify(ast, null, 2));
  } catch (error) {
    console.error("Nunjucks parse error:", error.message);
  }
}

console.log("\n=== IR ===");
if (language === "liquid") {
  const ir = liquidParse(template);
  console.log(JSON.stringify(ir, null, 2));
} else if (language === "nunjucks") {
  const ir = nunjucksParse(template);
  console.log(JSON.stringify(ir, null, 2));
} else {
  console.log("IR not implemented for", language);
}
