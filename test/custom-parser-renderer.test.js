import { test, describe } from "node:test";
import assert from "node:assert";
import { translate } from "../src/translate.js";

describe("Custom parser and renderer", () => {
  // Define a custom parser that parses simple variable syntax: $var
  const customParser = (template) => {
    const tokens = [];
    let i = 0;
    let currentText = "";

    while (i < template.length) {
      if (
        template[i] === "$" &&
        i + 1 < template.length &&
        /[a-zA-Z_]/.test(template[i + 1])
      ) {
        // Found variable, save any preceding text
        if (currentText) {
          tokens.push({ type: "text", content: currentText });
          currentText = "";
        }

        // Parse variable name
        i++; // skip $
        let varName = "";
        while (i < template.length && /[a-zA-Z0-9_.]/.test(template[i])) {
          varName += template[i];
          i++;
        }

        tokens.push({
          type: "output",
          expression: {
            postfix: varName.split("."),
            filters: [],
          },
          trimLeft: false,
          trimRight: false,
        });
      } else {
        currentText += template[i];
        i++;
      }
    }

    if (currentText) {
      tokens.push({ type: "text", content: currentText });
    }

    return tokens;
  };

  // Define a custom renderer that renders variables as: {var}
  const customRenderer = (ir) => {
    return ir
      .map((node) => {
        switch (node.type) {
          case "text":
            return node.content;
          case "output":
            return `{${node.expression.postfix.join(".")}}`;
          case "tag":
            return `[${node.name}]`;
          default:
            throw new Error(`Unsupported IR node type: ${node.type}`);
        }
      })
      .join("");
  };

  test("custom to custom translation", () => {
    const input = "Hello $name, welcome to $site.title!";
    const result = translate({
      from: "custom",
      to: "custom",
      input,
      customParsers: { custom: customParser },
      customRenderers: { custom: customRenderer },
    });

    assert.strictEqual(result, "Hello {name}, welcome to {site.title}!");
  });

  test("custom to liquid translation", () => {
    const input = "Hello $name!";
    const result = translate({
      from: "custom",
      to: "liquid",
      input,
      customParsers: { custom: customParser },
    });

    assert.strictEqual(result, "Hello {{ name }}!");
  });

  test("liquid to custom translation", () => {
    const input = "Hello {{ name }}!";
    const result = translate({
      from: "liquid",
      to: "custom",
      input,
      customRenderers: { custom: customRenderer },
    });

    assert.strictEqual(result, "Hello {name}!");
  });

  test("custom parser with property access", () => {
    const input = "$user.profile.name";
    const result = translate({
      from: "custom",
      to: "custom",
      input,
      customParsers: { custom: customParser },
      customRenderers: { custom: customRenderer },
    });

    assert.strictEqual(result, "{user.profile.name}");
  });

  test("custom parser with mixed content", () => {
    const input = "Name: $user.name, Age: $user.age years old";
    const result = translate({
      from: "custom",
      to: "liquid",
      input,
      customParsers: { custom: customParser },
    });

    assert.strictEqual(
      result,
      "Name: {{ user.name }}, Age: {{ user.age }} years old",
    );
  });
});
