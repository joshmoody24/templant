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
            // Handle array format: first element is input, all are valid outputs
            const fromTemplate = Array.isArray(templates[fromLang])
              ? templates[fromLang][0]
              : templates[fromLang];

            const toTemplates = Array.isArray(templates[toLang])
              ? templates[toLang]
              : [templates[toLang]];

            // Skip tests where source template is null
            if (fromTemplate === null) {
              return;
            }

            // If target is null, expect an error to be thrown
            if (toTemplates[0] === null) {
              assert.throws(
                () => {
                  translate({
                    from: fromLang,
                    to: toLang,
                    input: fromTemplate,
                  });
                },
                /does not support|not supported/i,
                `Expected translation from ${fromLang} to ${toLang} to throw an error for unsupported feature`,
              );
              return;
            }

            const result = translate({
              from: fromLang,
              to: toLang,
              input: fromTemplate,
            });

            // Check if result matches any valid output
            if (toTemplates.length === 1) {
              // Single expected value - use strictEqual for clear diff
              assert.strictEqual(result, toTemplates[0]);
            } else {
              // Multiple valid outputs - check if any match
              const isValidOutput = toTemplates.includes(result);
              if (!isValidOutput) {
                // Show the first valid option as expected for cleaner diff
                assert.strictEqual(
                  result,
                  toTemplates[0],
                  `Expected one of: [${toTemplates.join(", ")}]`,
                );
              }
            }
          });
        });
      });
    });
  });
});
