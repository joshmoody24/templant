# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Templant is a template language translation library that converts templates between different template engines (currently Liquid, with plans for Nunjucks, Mustache, etc.). It uses an intermediate representation (IR) to enable cross-language template conversion.

## Core Architecture

The system follows a three-layer architecture:

1. **Parser Layer** (`src/langs/*/parse.js`): Converts template language Ast to common IR
2. **IR Layer** (`src/types.d.ts`): Common intermediate representation shared across all languages
3. **Renderer Layer** (`src/langs/*/render.js`): Converts IR back to template language syntax

### IR Node Types

The IR consists of six core node types defined in `src/types.d.ts`:

- `IrTextNode` - Static text content
- `IrOutputNode` - Variable outputs with filters and property access
- `IrConditionalNode` - Branching logic (if/elsif/else, case/when, unless)
- `IrLoopNode` - Iteration constructs (for loops with optional else)
- `IrTagNode` - Generic tags (assign, capture, raw, etc.)
- `IrCommentNode` - Template comments

Key IR features:

- Whitespace control via `trimLeft`/`trimRight` flags
- Conditional variants: "if", "case", "unless"
- Complex filter handling with arguments
- Property access chains and array indexing

## Development Commands

```bash
# Run all tests
npm test

# Run specific test file
node --test test/translate.test.js

# Build dual ESM/CJS distribution
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Release new version
npm run release
```

## Development Workflow

When adding new template language features, follow this optimal workflow:

1. **Start with failing tests** - Add new test cases to `test/test-templates.js`
2. **Examine the Ast** - Use `./ast.js 'template syntax'` to inspect both the native Ast and current IR output
3. **Update parser** - Modify `src/langs/*/parse.js` to extract the needed information from Ast
4. **Update renderer** - Modify `src/langs/*/render.js` to output correct syntax from IR
5. **Update types** - Add new IR node types or extend existing ones in `src/types.d.ts` if needed

The `ast.js` script is crucial for development - it shows both the native template engine Ast and the current IR representation, helping identify what needs to be extracted from the Ast.

## Code Style

- Use camelCase for acronyms (e.g., `Ast` instead of `AST`, `Nasa` instead of `NASA`)

## Adding New Template Languages

To add support for a new template language:

1. Create `src/langs/[language]/parse.js` and `src/langs/[language]/render.js`
2. Implement `Parser` and `Renderer` function signatures from `src/types.d.ts`
3. Add to `src/langs/index.js` exports
4. Add comprehensive test cases to `test/test-templates.js`
5. Update `BuiltInLanguage` type in `src/types.d.ts`

## Test Structure

Tests use a data-driven approach in `test/test-templates.js` where each test case contains equivalent templates across all supported languages. This ensures translation accuracy and provides regression testing when adding new features.

The test suite includes comprehensive coverage of:

- Basic templating (variables, filters, property access)
- Control structures (conditionals, loops, case statements)
- Advanced features (whitespace control, raw blocks, comments)
- Edge cases (empty outputs, special characters, literals)

## Type System

The codebase uses TypeScript definitions with global type declarations in `src/global.d.ts` for internal development, while external consumers import types from the main package exports. The dual ESM/CJS build process copies `.d.ts` files to the `dist/` directory.
