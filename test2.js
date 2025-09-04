import { translate } from "./dist/translate.js";
console.log(translate({ from: "nunjucks", to: "mustache", input: "Hello {{name}}!" }));
