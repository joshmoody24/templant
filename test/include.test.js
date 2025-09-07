import { test, describe } from "node:test";
import assert from "node:assert";
import { translate } from "../src/translate.js";

describe("Include statement tests", () => {
  test("basic include translation", () => {
    const liquid = "{% include 'header.html' %}";
    const nunjucks = "{% include 'header.html' %}";

    // Liquid to Nunjucks
    const liquidToNunjucks = translate({
      from: "liquid",
      to: "nunjucks",
      input: liquid,
    });
    assert.strictEqual(liquidToNunjucks, nunjucks);

    // Nunjucks to Liquid
    const nunjucksToLiquid = translate({
      from: "nunjucks",
      to: "liquid",
      input: nunjucks,
    });
    assert.strictEqual(nunjucksToLiquid, liquid);

    // Round trip
    const roundTrip = translate({
      from: "liquid",
      to: "nunjucks",
      input: translate({
        from: "nunjucks",
        to: "liquid",
        input: nunjucks,
      }),
    });
    assert.strictEqual(roundTrip, nunjucks);
  });

  test("include with double quotes", () => {
    const liquidDouble = `{% include "header.html" %}`;
    const nunjucksDouble = `{% include "header.html" %}`;

    const liquidToNunjucks = translate({
      from: "liquid",
      to: "nunjucks",
      input: liquidDouble,
    });
    assert.strictEqual(liquidToNunjucks, nunjucksDouble);
  });

  test("include with whitespace control", () => {
    const liquidTrim = `{%- include 'header.html' -%}`;
    const nunjucksTrim = `{%- include 'header.html' -%}`;

    const liquidToNunjucks = translate({
      from: "liquid",
      to: "nunjucks",
      input: liquidTrim,
    });
    assert.strictEqual(liquidToNunjucks, nunjucksTrim);

    const nunjucksToLiquid = translate({
      from: "nunjucks",
      to: "liquid",
      input: nunjucksTrim,
    });
    assert.strictEqual(nunjucksToLiquid, liquidTrim);
  });

  test("include with complex template path", () => {
    const liquid = `{% include 'partials/header/main.html' %}`;
    const nunjucks = `{% include 'partials/header/main.html' %}`;

    const liquidToNunjucks = translate({
      from: "liquid",
      to: "nunjucks",
      input: liquid,
    });
    assert.strictEqual(liquidToNunjucks, nunjucks);
  });
});
