# Angular Audit Command

## Description
Audit an Angular 21 codebase for compliance with best practices, security, and performance standards.

## Usage
```
Audit the Angular codebase for [specific area or full audit]
```

## Audit Checklist

### Architecture
- [ ] All components are standalone (no NgModules)
- [ ] Clean architecture structure (core/features/shared)
- [ ] Services use providedIn: 'root'
- [ ] Proper separation of concerns
- [ ] No circular dependencies

### Components
- [ ] No standalone: true in decorators (v21 default)
- [ ] Uses input()/output() functions instead of decorators
- [ ] Uses signals for state management
- [ ] Uses computed() for derived state
- [ ] Uses native control flow (@if, @for, @switch)
- [ ] Uses @defer for lazy loading
- [ ] Uses inject() instead of constructor injection
- [ ] Host bindings in host object, not @HostBinding/@HostListener

### State Management
- [ ] Signals used for local state
- [ ] computed() used for derived state
- [ ] effect() used for side effects
- [ ] resource()/rxResource() used for async data
- [ ] No mutate() on signals (use update()/set())

### Forms
- [ ] Reactive Forms preferred over Template-driven
- [ ] Signals used for validation
- [ ] Proper error handling
- [ ] Password visibility toggle implemented
- [ ] Rate limiting for login attempts

### Styling
- [ ] PrimeNG unstyled mode enabled
- [ ] Pass Through API configured
- [ ] styles.css tokens used (no hex values)
- [ ] Dark mode with data-theme selector
- [ ] Class bindings instead of ngClass
- [ ] Style bindings instead of ngStyle

### Security
- [ ] JWT never in localStorage
- [ ] HttpOnly cookies or in-memory JWT
- [ ] Functional interceptors for auth
- [ ] DomSanitizer for user input
- [ ] OWASP guidelines followed
- [ ] No console.log in production
- [ ] Environment variables for secrets

### TypeScript
- [ ] Strict mode enabled
- [ ] No any types (use unknown)
- [ ] No @ts-ignore
- [ ] Proper type inference
- [ ] Interface/type definitions

### Performance
- [ ] Signals for automatic change detection
- [ ] @defer for lazy loading
- [ ] NgOptimizedImage for images
- [ ] No unnecessary re-renders
- [ ] Proper lazy loading of routes

### Accessibility
- [ ] WCAG 2.2 AA compliant
- [ ] Focus rings visible
- [ ] Text contrast ≥ 4.5:1
- [ ] Icon-only buttons have aria-label
- [ ] Modals close on Escape
- [ ] Minimum 24×24px tap targets
- [ ] AXE checks pass

### Testing
- [ ] Integration tests with Playwright
- [ ] User flow tests (Login -> Create -> Delete)
- [ ] No over-testing of simple components

## Report Format
```
# Angular 21 Audit Report

## Summary
- Total Issues: X
- Critical: X
- High: X
- Medium: X
- Low: X

## Critical Issues
1. [Issue description]
   - Location: [file:line]
   - Impact: [description]
   - Fix: [recommendation]

## High Priority Issues
...

## Medium Priority Issues
...

## Low Priority Issues
...

## Best Practices Violations
...

## Recommendations
...
```

## Automated Checks
```bash
ng lint
ng test
ng build --prod
```
