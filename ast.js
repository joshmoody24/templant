#!/usr/bin/env node

import { Liquid } from "liquidjs";
import { parse } from "./src/langs/liquid/parse.js";

const [template, language] = process.argv.slice(2);

if (!template) {
  console.error("Usage: node ast.js <template> [language]");
  console.error("Example: node ast.js 'Hello {{ name }}' liquid");
  process.exit(1);
}

if (language && language !== "liquid") {
  console.error("Only liquid is supported for now");
  process.exit(1);
}

console.log("=== Real AST ===");
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

console.log("\n=== IR ===");
const ir = parse(template);
console.log(JSON.stringify(ir, null, 2));
