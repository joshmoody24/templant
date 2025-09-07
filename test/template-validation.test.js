import { test, describe } from "node:test";
import assert from "node:assert";
import { Liquid } from "liquidjs";
import nunjucks from "nunjucks";
import { testTemplates } from "./test-templates.js";

const validators = {
  liquid: (template) => {
    const liquid = new Liquid();
    liquid.parse(template);
  },
  nunjucks: (template) => {
    nunjucks.compile(template);
  },
};

describe("Template syntax validation", () => {
  const supportedLanguages = new Set(
    Object.values(testTemplates).flatMap(Object.keys),
  );

  supportedLanguages.forEach((language) => {
    describe(`${language} templates`, () => {
      Object.entries(testTemplates).forEach(([testName, templates]) => {
        if (templates[language]) {
          test(`${testName} has valid ${language} syntax`, () => {
            try {
              validators[language](templates[language]);
            } catch (error) {
              assert.fail(
                `${language} template for '${testName}' is invalid: ${error.message}`,
              );
            }
          });
        }
      });
    });
  });
});
