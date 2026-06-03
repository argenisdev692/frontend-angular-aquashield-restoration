---
trigger: always_on
---

# Styling Rules — Angular 21 with PrimeNG Unstyled

> **Authority**: SINGLE SOURCE OF TRUTH for all styling decisions in Angular 21 projects.
> **Scope**: PrimeNG unstyled mode, styles.css design tokens, Pass Through API, dark mode.

## Core Principles

1. **Token-First Design**: All colors, spacing, and typography come from CSS custom properties in `styles.css`
2. **PrimeNG Unstyled**: Use PrimeNG components without pre-defined styles
3. **Pass Through API**: Map styles.css tokens to PrimeNG components via `pt` configuration
4. **Dark-First**: Default dark theme with light mode override via `[data-theme="light"]`
5. **No Hex Values**: NEVER use hardcoded hex colors - ALWAYS use `var(--token)`

## styles.css Design Tokens

### Color Tokens
```css
:root {
  /* Backgrounds */
  --bg-void: #081829;
  --bg-base: #0C2340;
  --bg-surface: #1a3a5c;
  --bg-elevated: #1a3a5c;
  --bg-overlay: #244166;
  --bg-app: var(--bg-base);
  --bg-card: var(--bg-elevated);
  --bg-hover: var(--bg-overlay);
  --bg-subtle: color-mix(in srgb, var(--bg-elevated) 70%, var(--bg-base));

  /* Brand Colors */
  --blue-500: #00B5E2;
  --purple-500: #33c4e8;
  --blue-400: var(--blue-500);
  
  /* Text Colors */
  --text-primary: #F0EEFF;
  --text-secondary: #B8C5D6;
  --text-muted: #7A8FA8;
  --text-disabled: #4D6B8A;

  /* Border Colors */
  --border-subtle: rgba(0, 181, 226, 0.12);
  --border-default: rgba(0, 181, 226, 0.22);
  --border-strong: rgba(0, 181, 226, 0.4);
  --border-hover: var(--border-strong);

  /* Accent Colors */
  --accent-primary: #00B5E2;
  --accent-secondary: #33c4e8;
  --accent-success: #10D988;
  --accent-warning: #F59E0B;
  --accent-error: #F43F5E;
  --accent-info: #00B5E2;

  /* Gradients */
  --grad-primary: linear-gradient(135deg, #0C2340 0%, #00B5E2 100%);
  --grad-glow: linear-gradient(135deg, #00B5E2 0%, #33c4e8 100%);
  --grad-text: linear-gradient(90deg, #00B5E2, #33c4e8);

  /* Typography */
  --font-sans: "Exo", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;

  /* Spacing & Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --transition: 0.2s ease;

  /* Input Tokens */
  --input-bg: var(--bg-elevated);
  --input-bg-disabled: color-mix(in srgb, var(--bg-elevated) 50%, var(--bg-base));
  --input-border: var(--border-default);
  --input-border-hover: var(--border-strong);
  --input-border-focus: var(--blue-500);
  --input-height: 44px;
  --input-radius: var(--radius-md);
}
```

### Light Mode Override
```css
[data-theme="light"] {
  --bg-base: #f8fafc;
  --bg-surface: #ffffff;
  --bg-elevated: #f1f5f9;
  --bg-app: var(--bg-base);
  --bg-card: var(--bg-elevated);
  --bg-hover: #e2e8f0;
  --bg-subtle: color-mix(in srgb, var(--bg-elevated) 72%, var(--bg-base));
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --text-disabled: #94a3b8;
}
```

## PrimeNG Unstyled Configuration

### App Config Setup
```typescript
// src/config/app.config.ts
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
// In component template
<p-button 
  label="Submit"
  [pt]="{
    root: 'btn-modern btn-modern-primary',
    icon: 'btn-icon'
  }"
/>
```

## Component Styling Patterns

### Button Styling
```typescript
// Use styles.css classes via Pass Through
pt: {
  button: {
    root: 'btn-modern btn-modern-primary'
  }
}

// Or inline with Tailwind + tokens
pt: {
  button: {
    root: '!bg-[var(--accent-primary)] !text-white !rounded-[var(--radius-md)]'
  }
}
```

### Input Styling
```typescript
pt: {
  input: {
    root: '!bg-[var(--input-bg)] !border-[var(--input-border)] !h-[var(--input-height)] !rounded-[var(--input-radius)]'
  }
}
```

### Card Styling
```typescript
pt: {
  panel: {
    root: 'card-modern'
  }
}
```

### Table Styling
```typescript
pt: {
  table: {
    root: '!bg-transparent !border-transparent',
    header: '!bg-transparent !border-b',
    body: '!bg-transparent'
  }
}
```

## Styling Rules

### DO's
✅ ALWAYS use CSS custom properties from `styles.css`
✅ ALWAYS read `styles.css` before implementing any component
✅ ALWAYS add new tokens to `styles.css` if they don't exist
✅ ALWAYS use PrimeNG unstyled mode with Pass Through
✅ ALWAYS map styles.css classes to PrimeNG components
✅ ALWAYS use class bindings instead of `ngClass`
✅ ALWAYS use style bindings instead of `ngStyle`
✅ ALWAYS test dark mode with `[data-theme="dark"]`

### DON'Ts
❌ NEVER use hardcoded hex colors
❌ NEVER use raw Tailwind color scale
❌ NEVER bypass PrimeNG unstyled mode
❌ NEVER use `ngClass` - use class bindings
❌ NEVER use `ngStyle` - use style bindings
❌ NEVER add inline styles with hex values
❌ NEVER create component-specific CSS files unless absolutely necessary

## Common Styling Patterns

### Modern Button
```typescript
// styles.css
.btn-modern {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 14px;
  transition: all var(--transition);
  border: 1px solid transparent;
  cursor: pointer;
}

.btn-modern-primary {
  background: var(--grad-primary);
  color: #ffffff;
  border: 1px solid rgba(0, 181, 226, 0.3);
  box-shadow: 0 4px 12px rgba(0, 181, 226, 0.3);
  padding: 8px 16px;
}

.btn-modern-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(51, 196, 232, 0.4);
}
```

### Modern Card
```typescript
// styles.css
.card-modern {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  overflow: hidden;
  backdrop-filter: blur(10px);
}
```

### Action Buttons (CRUD)
```css
.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: color-mix(in srgb, var(--bg-elevated) 60%, transparent);
  color: var(--text-secondary);
  transition: all var(--transition);
  cursor: pointer;
}

.btn-action:hover {
  background: var(--bg-overlay);
  border-color: var(--border-strong);
  color: var(--text-primary);
  transform: scale(1.1);
}

.btn-action-view { color: var(--accent-info); }
.btn-action-edit { color: var(--accent-info); }
.btn-action-delete { color: var(--accent-error); }
.btn-action-restore { color: var(--accent-success); }
```

## Modern Button Animations (2026)

### Primary Button with Glow Effect
```css
.btn-primary-modern {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: var(--grad-primary);
  color: #ffffff;
  border: 1px solid rgba(0, 181, 226, 0.3);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  cursor: pointer;
  overflow: hidden;
  transition: all var(--transition);
  box-shadow: 0 4px 12px rgba(0, 181, 226, 0.3);
}

.btn-primary-modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-primary-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 181, 226, 0.4);
  border-color: rgba(0, 181, 226, 0.5);
}

.btn-primary-modern:hover::before {
  left: 100%;
}

.btn-primary-modern:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(0, 181, 226, 0.3);
}
```

### Secondary Button with Subtle Border
```css
.btn-secondary-modern {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.btn-secondary-modern:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.btn-secondary-modern:active {
  transform: translateY(0);
}
```

### Ghost Button with Hover Fill
```css
.btn-ghost-modern {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.btn-ghost-modern:hover {
  background: color-mix(in srgb, var(--bg-elevated) 50%, transparent);
  color: var(--text-primary);
}

.btn-ghost-modern:active {
  background: color-mix(in srgb, var(--bg-elevated) 70%, transparent);
}
```

### CRUD Action Buttons (Modern 2026)
```css
.btn-crud-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-elevated) 50%, transparent);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  overflow: hidden;
}

.btn-crud-action::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: currentColor;
  opacity: 0;
  border-radius: inherit;
  transition: opacity var(--transition);
}

.btn-crud-action:hover {
  transform: scale(1.15);
  border-color: currentColor;
}

.btn-crud-action:hover::after {
  opacity: 0.1;
}

.btn-crud-action:active {
  transform: scale(0.95);
}

.btn-crud-action-view {
  color: var(--accent-info);
}

.btn-crud-action-view:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-info) 30%, transparent);
}

.btn-crud-action-edit {
  color: var(--accent-primary);
}

.btn-crud-action-edit:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary) 30%, transparent);
}

.btn-crud-action-delete {
  color: var(--accent-error);
}

.btn-crud-action-delete:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-error) 30%, transparent);
}

.btn-crud-action-restore {
  color: var(--accent-success);
}

.btn-crud-action-restore:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-success) 30%, transparent);
}
```

### Form Submit Button with Loading State
```css
.btn-submit {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  background: var(--grad-primary);
  color: #ffffff;
  border: 1px solid rgba(0, 181, 226, 0.3);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  cursor: pointer;
  overflow: hidden;
  transition: all var(--transition);
  box-shadow: 0 4px 12px rgba(0, 181, 226, 0.3);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 181, 226, 0.4);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(0);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-submit .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Icon Button with Ripple Effect
```css
.btn-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  overflow: hidden;
}

.btn-icon::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, currentColor 0%, transparent 70%);
  opacity: 0;
  transform: scale(0);
  transition: all 0.4s ease;
}

.btn-icon:hover {
  color: var(--text-primary);
  border-color: var(--border-default);
}

.btn-icon:hover::before {
  opacity: 0.1;
  transform: scale(1.5);
}

.btn-icon:active::before {
  opacity: 0.15;
  transform: scale(1);
}
```

### FAB (Floating Action Button)
```css
.btn-fab {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--grad-primary);
  color: #ffffff;
  border: 1px solid rgba(0, 181, 226, 0.3);
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(0, 181, 226, 0.4);
  cursor: pointer;
  transition: all var(--transition);
  z-index: 100;
}

.btn-fab:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 181, 226, 0.5);
}

.btn-fab:active {
  transform: translateY(-2px) scale(1);
}
```

### Button Group
```css
.btn-group {
  display: inline-flex;
  gap: var(--space-2);
}

.btn-group .btn-primary-modern:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.btn-group .btn-primary-modern:last-child {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.btn-group .btn-primary-modern:not(:first-child):not(:last-child) {
  border-radius: 0;
}

.btn-group .btn-primary-modern + .btn-primary-modern {
  margin-left: -1px;
}
```

### PrimeNG Pass Through for Modern Buttons
```typescript
// In component
pt: {
  button: {
    root: 'btn-primary-modern',
    icon: 'btn-icon'
  }
}

// For CRUD actions
pt: {
  button: {
    root: 'btn-crud-action btn-crud-action-edit'
  }
}

// For form submit
pt: {
  button: {
    root: 'btn-submit'
  }
}
```

## Accessibility

### Focus Rings
```css
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

### Text Contrast
- Normal text: ≥ 4.5:1 contrast ratio
- Large text: ≥ 3:1 contrast ratio
- Interactive elements: ≥ 3:1 contrast ratio

### Minimum Tap Targets
- Buttons: Minimum 24×24px
- Links: Minimum 24×24px
- Touch targets: Minimum 44×44px

## Animations & Transitions

### Principles (2026 Minimalist Trends)
- **Motion Disciplined**: Animations that explain, not decorate
- **Neo-Minimalism**: Clean layouts with bold typography
- **Calm Interfaces**: Reduce cognitive load
- **Performance**: Prefer CSS animations over JavaScript
- **Accessibility**: Respect `prefers-reduced-motion`

### Existing Animations (styles.css)
- `wave-slide` - Background wave animation
- `mesh-float-1`, `mesh-float-2`, `mesh-float-3` - Gradient mesh animations
- `auth-rain-fall` - Auth page rain effect
- `auth-hail-fall` - Auth page hail effect

### Usage
```css
.animation-mesh {
  animation: mesh-float-1 8s ease-in-out infinite;
}
```

### Transition Tokens
```css
:root {
  --transition: 0.2s ease;
  --transition-fast: 0.1s ease;
  --transition-slow: 0.3s ease;
}
```

### Transition Patterns
```css
/* Hover transitions */
.btn-modern {
  transition: all var(--transition);
}

.btn-modern:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(51, 196, 232, 0.4);
}

/* Focus transitions */
input:focus {
  transition: border-color var(--transition), box-shadow var(--transition);
}

/* Fade transitions */
.fade-enter {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--transition-slow), transform var(--transition-slow);
}
```

### Animation Best Practices
✅ Use CSS animations for simple, repeatable effects
✅ Use transitions for state changes (hover, focus)
✅ Keep animations under 300ms for UI feedback
✅ Use `ease` or `ease-out` for natural feel
✅ Respect `prefers-reduced-motion` media query
❌ NEVER use JavaScript animations for simple effects
❌ NEVER use long animations (>500ms) for UI feedback
❌ NEVER animate layout properties (width, height) - use transform
❌ NEVER use animations that distract from content

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Minimalist Design Principles (2026)

### Core Principles
1. **Content-First**: Design around content, not decoration
2. **Bold Typography**: Use typography as primary visual element
3. **Generous Whitespace**: Allow content to breathe
4. **Subtle Gradients**: Use gradients for depth, not distraction
5. **Limited Color Palette**: Stick to brand colors with purpose
6. **Intentional Motion**: Every animation must have purpose

### Typography
```css
:root {
  --font-sans: "Exo", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
  
  /* Font sizes - scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  
  /* Font weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Spacing System
```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
}
```

### Layout Patterns
```css
/* Card with generous spacing */
.card-modern {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-4);
}

/* Section with breathing room */
.section {
  padding: var(--space-12) var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

/* Minimal button */
.btn-minimal {
  background: transparent;
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  transition: all var(--transition);
}

.btn-minimal:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}
```

### Glassmorphism (Subtle)
```css
.glass-subtle {
  background: color-mix(in srgb, var(--bg-elevated) 80%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}
```

### Gradient Usage
```css
/* Text gradient for emphasis */
.text-gradient {
  background: var(--grad-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Subtle background gradient */
.bg-gradient-subtle {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--bg-base) 95%, var(--accent-primary)) 0%, 
    var(--bg-base) 100%
  );
}
```

### Icon Styling
```css
.icon {
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
  transition: color var(--transition);
}

.icon:hover {
  color: var(--text-primary);
}

.icon-accent {
  color: var(--accent-primary);
}
```

### Minimalist Form Patterns
```css
.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  height: var(--input-height);
  padding: 0 var(--space-4);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--input-radius);
  color: var(--text-primary);
  font-size: var(--text-base);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.form-input:focus {
  outline: none;
  border-color: var(--input-border-focus);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 25%, transparent);
}

.form-input::placeholder {
  color: var(--text-disabled);
}
```

### Minimalist Table Patterns
```css
.table-minimal {
  width: 100%;
  border-collapse: collapse;
}

.table-minimal th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.table-minimal td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
}

.table-minimal tr:hover td {
  background: var(--bg-subtle);
}
```

### Dark Mode Minimalism
```css
[data-theme="dark"] {
  /* Deeper blacks for true dark mode */
  --bg-void: #050a14;
  --bg-base: #0a1520;
  
  /* Subtle accent glows */
  --glow-primary: 0 0 20px color-mix(in srgb, var(--accent-primary) 20%, transparent);
  
  /* Reduced saturation for calm interface */
  --text-primary: #e8e6f0;
  --text-secondary: #a0b0c0;
}
```

### Anti-Patterns to Avoid
❌ NEVER use multiple competing gradients
❌ NEVER use bright, saturated colors unnecessarily
❌ NEVER use excessive shadows or glows
❌ NEVER use tiny fonts (<12px)
❌ NEVER cramp content with insufficient spacing
❌ NEVER use decorative animations without purpose
❌ NEVER use more than 3-4 colors in a single component
❌ NEVER use complex patterns or textures

## External Library Overrides

### Google Maps
```css
gmp-place-autocomplete input {
  background: var(--input-bg) !important;
  border: 1px solid var(--input-border) !important;
  color: var(--text-primary) !important;
  /* ... see styles.css for full override */
}
```

### FullCalendar
```css
.aq-calendar {
  --fc-border-color: var(--border-subtle);
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: color-mix(in srgb, var(--bg-overlay) 35%, transparent);
  /* ... see styles.css for full override */
}
```

## Component Styling Checklist

Before implementing any component:
- [ ] Read `styles.css` to find existing tokens
- [ ] If token doesn't exist, add it to `styles.css` first
- [ ] Use PrimeNG unstyled mode
- [ ] Map tokens via Pass Through API
- [ ] Test dark mode
- [ ] Test light mode
- [ ] Verify accessibility (contrast, focus rings)
- [ ] Verify responsive behavior
