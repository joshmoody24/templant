/**
 * Test templates - equivalent templates across different template languages
 * Each key represents a test case, with equivalent templates for each supported language
 */
export const testTemplates = {
  trivial: {
    liquid: "Hello {{ name }}!",
    nunjucks: "Hello {{ name }}!",
    // mustache: "Hello {{ name }}!",
  },
  nestedObjects: {
    liquid: "User: {{ user.name.first }} {{ user.name.last }}",
    nunjucks: "User: {{ user.name.first }} {{ user.name.last }}",
    // mustache: "User: {{ user.name.first }} {{ user.name.last }}",
  },
  arrayAccess: {
    liquid: "First: {{ items[0] }}, Role: {{ user.roles[1] }}",
    nunjucks: "First: {{ items[0] }}, Role: {{ user.roles[1] }}",
    // mustache: "First: {{ items.0 }}, Role: {{ user.roles.1 }}",
  },
  filters: {
    liquid: "Hello {{ name | upcase }}!",
    nunjucks: "Hello {{ name | upper }}!",
    // mustache: "Hello {{ name }}!", // Mustache does not support filters
  },
  multipleFilters: {
    liquid: "Name: {{ name | downcase | strip }}",
    nunjucks: "Name: {{ name | lower | trim }}",
    // mustache: "Name: {{ name }}", // Mustache does not support filters
  },
  filterArguments: {
    liquid: 'Date: {{ date | date: "%Y-%m-%d" }}',
    nunjucks: 'Date: {{ date | date("%Y-%m-%d") }}',
    // mustache: "Date: {{ date }}", // Mustache does not support filters
  },
  comments: {
    liquid: "Before{% comment %}This is hidden{% endcomment %}After",
    nunjucks: "Before{# This is hidden #}After",
    // mustache: "Before{{! This is hidden }}After",
  },
  whitespaceControl: {
    liquid: "{{- name -}}",
    nunjucks: "{{- name -}}",
    // mustache: "{{ name }}", // Mustache doesn't support whitespace control
  },
  conditionals: {
    liquid: "{% if user %}Hello {{ user.name }}!{% endif %}",
    nunjucks: "{% if user %}Hello {{ user.name }}!{% endif %}",
    // mustache: "{{#user}}Hello {{ user.name }}!{{/user}}",
  },
  multipleConditionals: {
    liquid:
      "{% if user %}Hello {{ user.name }}!{% elsif admin %}Hello Admin!{% else %}Hello Guest!{% endif %}",
    nunjucks:
      "{% if user %}Hello {{ user.name }}!{% elif admin %}Hello Admin!{% else %}Hello Guest!{% endif %}",
    // mustache:
    //   "{{#user}}Hello {{ user.name }}!{{/user}}{{^user}}{{#admin}}Hello Admin!{{/admin}}{{^admin}}Hello Guest!{{/admin}}{{/user}}",
  },
  complexExpressions: {
    liquid: "{% if user.age >= 18 and user.verified %}Welcome!{% endif %}",
    nunjucks: "{% if user.age >= 18 and user.verified %}Welcome!{% endif %}",
    // mustache: "{{#user}}{{#ageEighteenOrOlder}}{{#verified}}Welcome!{{/verified}}{{/ageEighteenOrOlder}}{{/user}}",
  },
  loops: {
    liquid: "{% for item in items %}- {{ item }} {% endfor %}",
    nunjucks: "{% for item in items %}- {{ item }} {% endfor %}",
    // mustache: "{{#items}}- {{ . }} {{/items}}",
  },
  loopVariables: {
    liquid:
      "{% for item in items %}{{ forloop.index }}: {{ item }} {% endfor %}",
    nunjucks:
      "{% for item in items %}{{ loop.index }}: {{ item }} {% endfor %}",
    // mustache: "{{#items}}{{@index}}: {{ . }} {{/items}}",
  },
  emptyCollections: {
    liquid:
      "{% for item in empty_items %}{{ item }}{% else %}No items{% endfor %}",
    nunjucks:
      "{% for item in empty_items %}{{ item }}{% else %}No items{% endfor %}",
    // mustache: "{{#empty_items}}{{ . }}{{/empty_items}}{{^empty_items}}No items{{/empty_items}}",
  },
  assignments: {
    liquid: "{% assign total = price | plus: tax %}Total: {{ total }}",
    nunjucks: "{% set total = price + tax %}Total: {{ total }}",
    // mustache: "Total: {{ total }}", // Would need preprocessing
  },
  captures: {
    liquid:
      "{% capture heading %}Chapter {{ chapter.number }}{% endcapture %}{{ heading }}",
    nunjucks:
      "{% set heading %}Chapter {{ chapter.number }}{% endset %}{{ heading }}",
    // mustache: "Chapter {{ chapter.number }}", // Would need preprocessing
  },
  nestedLoops: {
    liquid:
      "{% for category in categories %}{% for item in category.items %}{{ category.name }}: {{ item }} {% endfor %}{% endfor %}",
    nunjucks:
      "{% for category in categories %}{% for item in category.items %}{{ category.name }}: {{ item }} {% endfor %}{% endfor %}",
    // mustache: "{{#categories}}{{#items}}{{ ../name }}: {{ . }} {{/items}}{{/categories}}",
  },
  mixedContent: {
    liquid:
      "{% for user in users %}{% if user.active %}{{ user.name | upcase }}{% endif %}{% endfor %}",
    nunjucks:
      "{% for user in users %}{% if user.active %}{{ user.name | upper }}{% endif %}{% endfor %}",
    // mustache: "{{#users}}{{#active}}{{ name }}{{/active}}{{/users}}",
  },
  include: {
    liquid: "{% include 'header.html' %}",
    nunjucks: "{% include 'header.html' %}",
    // mustache: "{{> header}}", // Mustache uses partials
  },
  break: {
    liquid:
      "{% for item in items %}{% if item.skip %}{% break %}{% endif %}{{ item }}{% endfor %}",
    nunjucks:
      "{% for item in items %}{% if item.skip %}{% break %}{% endif %}{{ item }}{% endfor %}",
    // mustache: "{{#items}}{{^skip}}{{ . }}{{/skip}}{{/items}}", // Mustache doesn't have break
  },
  continue: {
    liquid:
      "{% for item in items %}{% if item.skip %}{% continue %}{% endif %}{{ item }}{% endfor %}",
    nunjucks:
      "{% for item in items %}{% if item.skip %}{% continue %}{% endif %}{{ item }}{% endfor %}",
    // mustache: "{{#items}}{{^skip}}{{ . }}{{/skip}}{{/items}}", // Mustache doesn't have continue
  },
  tagWhitespaceControl: {
    liquid: "{%- if user -%}Hello{%- endif -%}",
    nunjucks: "{%- if user -%}Hello{%- endif -%}",
    // mustache: "{{#user}}Hello{{/user}}", // Mustache doesn't support whitespace control
  },
  complexFilters: {
    liquid: "{{ products | where: 'available', true | sort: 'price' | first }}",
    nunjucks:
      "{{ (products | selectattr('available') | sort(attribute='price') | first) }}",
    // mustache: "{{ first_available_product }}", // Would need preprocessing
  },
  filterWithMultipleArgs: {
    liquid: "{{ text | replace: 'old', 'new' | truncate: 50, '...' }}",
    nunjucks: "{{ text | replace('old', 'new') | truncate(50, true, '...') }}",
    // mustache: "{{ processed_text }}", // Would need preprocessing
  },
  caseStatement: {
    liquid:
      "{% case product.type %}{% when 'shirt' %}Clothing{% when 'book' %}Literature{% else %}Other{% endcase %}",
    nunjucks:
      "{% if product.type == 'shirt' %}Clothing{% elif product.type == 'book' %}Literature{% else %}Other{% endif %}",
    // mustache: "{{#product}}{{#shirt}}Clothing{{/shirt}}{{#book}}Literature{{/book}}{{#other}}Other{{/other}}{{/product}}",
  },
  unless: {
    liquid: "{% unless user.banned %}Welcome!{% endunless %}",
    nunjucks: "{% if not user.banned %}Welcome!{% endif %}",
    // mustache: "{{^user.banned}}Welcome!{{/user.banned}}",
  },
  raw: {
    liquid: "{% raw %}{{ this won't be processed }}{% endraw %}",
    nunjucks: "{% raw %}{{ this won't be processed }}{% endraw %}",
    // mustache: "{{ this won't be processed }}", // Mustache doesn't have raw blocks
  },
  liquidObjects: {
    liquid:
      "{% for item in items %}{{ forloop.first }} {{ forloop.last }} {{ forloop.rindex }}{% endfor %}",
    nunjucks:
      "{% for item in items %}{{ loop.first }} {{ loop.last }} {{ loop.revindex }}{% endfor %}",
    // mustache: "{{#items}}{{@first}} {{@last}} {{@index}}{{/items}}", // Different loop variables
  },
  loopVariablesOutsideLoop: {
    liquid: "{{ forloop.first }} {{ forloop.last }} {{ forloop.rindex }}",
    nunjucks: "{{ forloop.first }} {{ forloop.last }} {{ forloop.rindex }}",
    // These should NOT be translated since they're outside loop context
  },
  loopVariablesNunjucksOutside: {
    liquid: "{{ loop.first }} {{ loop.last }} {{ loop.revindex }}",
    nunjucks: "{{ loop.first }} {{ loop.last }} {{ loop.revindex }}",
    // These should NOT be translated since they're outside loop context
  },
  emptyOutput: {
    liquid: "{{ '' }}{{ null }}{{ '' }}",
    nunjucks: "{{ '' }}{{ null }}{{ '' }}",
    // mustache: "{{ empty }}{{ null }}{{ blank }}",
  },
  specialCharacters: {
    liquid: "{{ 'string with \"quotes\" and \\backslashes' }}",
    nunjucks: "{{ 'string with \"quotes\" and \\backslashes' }}",
    // mustache: "{{ escaped_string }}",
  },
  numberLiterals: {
    liquid: "{{ 42 }} {{ 3.14 }} {{ -5 }}",
    nunjucks: "{{ 42 }} {{ 3.14 }} {{ -5 }}",
    // mustache: "{{ number1 }} {{ number2 }} {{ number3 }}",
  },
};
