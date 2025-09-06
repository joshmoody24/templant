import { translate, TranslateArgs } from "./src/translate";

const args: TranslateArgs = {
  from: "markdown",
  to: "html",
  input: "# Hello, world!",
  customParsers: {},
  customRenderers: {},
};

translate({
  from: "legacyRedo",
  to: "liquid",
  input: "",
  customParsers: { legacyRedo: "" },
});
