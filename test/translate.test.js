import { test, describe } from "node:test";
import assert from "node:assert";
import { translate } from "../src/translate.js";
import { testTemplates } from "./test-templates.js";

describe("Template translation", () => {
  // Get all supported languages from test templates
  const supportedLanguages = Object.keys(testTemplates.simple);
  
  // Test each template case
  Object.entries(testTemplates).forEach(([testCase, templates]) => {
    describe(`${testCase} template`, () => {
      // Test conversion between each pair of languages
      supportedLanguages.forEach(fromLang => {
        supportedLanguages.forEach(toLang => {
          test(`converts ${fromLang} to ${toLang}`, () => {
            const result = translate({
              from: fromLang,
              to: toLang,
              input: templates[fromLang]
            });
            
            // Should produce the expected template for target language
            assert.strictEqual(result, templates[toLang]);
          });
        });
      });
    });
  });
});

