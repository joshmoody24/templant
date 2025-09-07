import { test, describe } from "node:test";
import assert from "node:assert";
import { translate } from "../src/translate.js";
import { testTemplates } from "./test-templates.js";

describe("Template translation", () => {
  const supportedLanguages = new Set(
    Object.values(testTemplates).flatMap(Object.keys),
  );

  Object.entries(testTemplates).forEach(([testCase, templates]) => {
    describe(`${testCase} template`, () => {
      // Test conversion between each pair of languages
      supportedLanguages.forEach((fromLang) => {
        supportedLanguages.forEach((toLang) => {
          test(`converts ${fromLang} to ${toLang}`, () => {
            const result = translate({
              from: fromLang,
              to: toLang,
              input: templates[fromLang],
            });
            assert.strictEqual(result, templates[toLang]);
          });
        });
      });
    });
  });
});
