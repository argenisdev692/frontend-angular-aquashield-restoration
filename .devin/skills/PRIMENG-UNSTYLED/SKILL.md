# PrimeNG Unstyled Mode Skill

## Overview
Expert in configuring and using PrimeNG with unstyled mode and Pass Through API to maintain custom design systems.

## Core Concepts

### Unstyled Mode
- PrimeNG components without pre-defined styles
- Full control over component styling
- Pass Through API for DOM element customization
- CSS variables for theming

### Pass Through API
- `pt` option to customize each DOM element
- `ptOptions` for merge behavior
- Map custom CSS classes to PrimeNG components

## Configuration

### App Config Setup
```typescript
// app.config.ts
import { providePrimeNG } from 'primeng/config';
import { Aura } from 'primeng/themes';

providePrimeNG({
  unstyled: true,
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '[data-theme="dark"]'
    }
  },
  pt: {
    button: { 
      root: 'btn-modern btn-modern-primary' 
    },
    input: { 
      root: 'form-input' 
    },
    // Map styles.css classes
  }
})
```

### Component-Level Pass Through
```typescript
<p-button 
  label="Submit"
  [pt]="{
    root: 'btn-modern btn-modern-primary',
    icon: 'btn-icon'
  }"
/>
```

## Design Token Mapping

### Button Mapping
```typescript
pt: {
  button: {
    root: 'btn-modern btn-modern-primary',
    label: '!font-semibold'
  }
}
```

### Input Mapping
```typescript
pt: {
  input: {
    root: 'form-input',
    // Uses styles.css tokens:
    // --input-bg, --input-border, --input-height, etc.
  }
}
```

### Table Mapping
```typescript
pt: {
  table: {
    root: 'card-modern',
    header: '!bg-transparent !border-b',
    body: '!bg-transparent'
  }
}
```

## Integration with styles.css

### Using Existing Tokens
```css
/* styles.css */
:root {
  --input-bg: var(--bg-elevated);
  --input-border: var(--border-default);
  --input-height: 44px;
  --input-radius: var(--radius-md);
}
```

```typescript
// Component uses these tokens via Pass Through
pt: {
  input: {
    root: '!bg-[var(--input-bg)] !border-[var(--input-border)] !h-[var(--input-height)] !rounded-[var(--input-radius)]'
  }
}
```

## Common Patterns

### Styled Button
```typescript
<p-button 
  label="Primary Action"
  [pt]="{
    root: 'btn-modern btn-modern-primary'
  }"
/>
```

### Styled Input
```typescript
<p-input 
  [pt]="{
    root: 'form-input'
  }"
/>
```

### Styled Dialog
```typescript
<p-dialog 
  [pt]="{
    root: 'card-modern',
    header: '!text-white !font-bold',
    content: '!p-0'
  }"
>
  <ng-template pTemplate="header">Title</ng-template>
  Content
</p-dialog>
```

## Best Practices
- Always use unstyled mode for custom designs
- Map styles.css tokens via Pass Through
- Keep component-specific styles minimal
- Use CSS custom properties for theming
- Test dark mode with `data-theme` selector
- Maintain consistent spacing and radius tokens
