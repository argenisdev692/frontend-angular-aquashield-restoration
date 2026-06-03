# Angular 21 Development Rules

## Component Development
- All components MUST be standalone (no `standalone: true` needed in v21)
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in @Component decorator
- Use `input()` and `output()` functions instead of `@Input()` and `@Output()` decorators
- Use signals for state management: `signal()`, `computed()`, `effect()`
- Use native control flow: `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use `@defer` for lazy loading heavy components
- Use `inject()` instead of constructor injection
- Put host bindings in `host` object of decorator, NOT `@HostBinding`/`@HostListener`
- Use `NgOptimizedImage` for static images (not base64)

## State Management
- Use `signal()` for local component state
- Use `computed()` for derived state
- Use `effect()` for side effects
- Use `resource()` or `rxResource()` for async data fetching
- NEVER use `mutate()` on signals - use `update()` or `set()`

## Forms
- Prefer Reactive Forms over Template-driven
- Use Signals for form validation
- Implement password visibility toggle
- Implement rate limiting for login attempts
- NEVER store JWT in localStorage

## Styling
- Use PrimeNG unstyled mode with Pass Through API
- Map styles.css tokens to PrimeNG components via `pt` configuration
- NEVER use hex values - ALWAYS use CSS custom properties
- Use class bindings instead of `ngClass`
- Use style bindings instead of `ngStyle`

## Security
- NEVER store JWT in localStorage (use HttpOnly cookies or in-memory)
- Use functional interceptors for auth
- Sanitize all user input with `DomSanitizer`
- Follow OWASP guidelines

## Configuration & Environment
- NEVER hardcode external service URLs (APIs, CDNs, fonts, etc.)
- NEVER hardcode environment variable values in code
- Use environment variables for all external service URLs
- Reference environment variables via `import.meta.env['VAR_NAME']` or Angular's environment files
- Add all required environment variables to `.env.example`

## Accessibility
- MUST pass all AXE checks
- MUST follow WCAG AA minimums (focus management, color contrast, ARIA attributes)
- Implement proper focus management for interactive elements
- Ensure keyboard navigation works for all interactive components

## TypeScript
- Strict mode enabled
- NEVER use `any` - use `unknown` when type is uncertain
- NEVER use `@ts-ignore`
- Prefer type inference when obvious

## Testing
- Focus on integration tests with Playwright
- Test complete user flows (Login -> Create -> Delete)
- Don't over-test simple components with unit tests

## Performance
- Signals automatically handle change detection
- Use `@defer` for lazy loading
- Use `NgOptimizedImage` for images
