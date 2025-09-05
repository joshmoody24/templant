import { parse } from "./src/langs/liquid/parse.js";
import { Liquid } from "liquidjs";
import { render } from "./src/langs/liquid/render.js";

const template = "Hello {{ test }} {{ test2[0].foo | upcase }}";

console.log(new Liquid().parse(template)[3].value);

const ir = parse(template);
console.log(render(ir));
