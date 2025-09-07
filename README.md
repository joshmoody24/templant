# Templant

Convert templates between different template languages like Liquid and Nunjucks.

## Install

```bash
npm install templant
```

## Usage

```javascript
import { translate } from 'templant';

const result = translate({
  from: 'liquid',
  to: 'nunjucks',
  input: '{{ name | upcase }}'
});

console.log(result); // {{ name | upper }}
```

## Examples

### Variables and Filters

**Liquid to Nunjucks:**
```javascript
// Input:  {{ user.name | upcase }}
// Output: {{ user.name | upper }}

// Input:  {{ date | date: "%Y-%m-%d" }}
// Output: {{ date | date("%Y-%m-%d") }}
```

**Nunjucks to Liquid:**
```javascript
// Input:  {{ items | length }}
// Output: {{ items | size }}

// Input:  {{ title or 'Untitled' }}
// Output: {{ title | default: 'Untitled' }}
```

### Conditionals

**Liquid to Nunjucks:**
```javascript
// Input:  {% if user %}Hello!{% elsif admin %}Hi Admin{% else %}Guest{% endif %}
// Output: {% if user %}Hello!{% elif admin %}Hi Admin{% else %}Guest{% endif %}

// Input:  {% unless user.banned %}Welcome!{% endunless %}
// Output: {% if not user.banned %}Welcome!{% endif %}
```

### Loops

**Liquid to Nunjucks:**
```javascript
// Input:  {% for item in items %}{{ forloop.index }}: {{ item }}{% endfor %}
// Output: {% for item in items %}{{ loop.index }}: {{ item }}{% endfor %}
```

### Assignments

**Liquid to Nunjucks:**
```javascript
// Input:  {% assign total = price | plus: tax %}
// Output: {% set total = price + tax %}

// Input:  {% capture heading %}Chapter {{ num }}{% endcapture %}
// Output: {% set heading %}Chapter {{ num }}{% endset %}
```

### Comments

**Liquid to Nunjucks:**
```javascript
// Input:  {% comment %}Hidden text{% endcomment %}
// Output: {# Hidden text #}
```

### Math Operations

**Liquid to Nunjucks:**
```javascript
// Input:  {{ price | plus: tax | times: 2 }}
// Output: {{ (price + tax) * 2 }}

// Input:  {{ 17 | modulo: 5 }}
// Output: {{ 17 % 5 }}
```

## Supported Languages

- **Liquid** - Shopify's template language
- **Nunjucks** - Mozilla's template language

## What Gets Translated

- Variables and property access
- Filters (upcase/upper, downcase/lower, etc.)
- Control flow (if/unless, loops)
- Comments
- Assignments and captures
- Math operations
- Whitespace control

## Not Yet Supported

Some advanced features are not currently supported:

- **Custom filters** - User-defined filters won't translate
- **Macros/functions** - Nunjucks macros and Liquid functions
- **Template inheritance** - Block/extends syntax
- **Advanced loop controls** - Break/continue statements (Liquid only)
- **Complex expressions** - Some nested operations may not convert perfectly
- **Language-specific features** - Features unique to one template engine

Perfect for migrating basic to intermediate templates between different template engines!