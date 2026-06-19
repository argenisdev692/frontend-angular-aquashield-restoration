# Angular 22 Development Rules

## Component Development
- All components MUST be standalone — NEVER write `standalone: true` (it is the v22 default)
- Do NOT import `CommonModule` for control flow — `@if`/`@for`/`@switch` are built in; import only what the template uses
- **Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` in NEW components** — OnPush is the v22 default; setting it is redundant. Existing explicit OnPush in this codebase is safe to keep.
- **`ChangeDetectionStrategy.Default` is `@deprecated` in v22** — it is now an alias for `ChangeDetectionStrategy.Eager` and is due to be removed; use `Eager` and migrate any code that referenced `Default`. `OnPush` is unchanged
- Use `input()` and `output()` functions instead of `@Input()` and `@Output()` decorators
- Use signals for state management: `signal()`, `computed()`, `effect()`
- Use native control flow: `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use `@defer` for lazy loading heavy components
- Use `inject()` instead of constructor injection
- Put host bindings in `host` object of decorator, NOT `@HostBinding`/`@HostListener`
- Use `NgOptimizedImage` for static images (not base64)

## State Management
- The app is **zoneless** (`provideZonelessChangeDetection()`): there is no Zone.js — all UI updates must flow through signals
- Use `signal()` for local component state
- Use `computed()` for derived state
- Use `effect()` for side effects
- Use `debounced()` for debouncing signal values (new in v22)
- Use `resource()` for Promise-returning async, `rxResource()` for Observable-returning async
- Use `httpResource()` for declarative HTTP data fetching with signals — **stable in v22**
- NEVER use `mutate()` on signals — use `update()` or `set()`

## Dependency Injection
- Use `inject()` — never constructor injection
- **Prefer `@Service()` over `@Injectable({ providedIn: 'root' })` for new singleton services** — `@Service()` is stable in v22 and is a clean shorthand; `@Injectable()` remains available for non-root scopes
- Use `injectAsync()` for lazy, code-split service loading (only load when needed at runtime)
- `providedIn: 'root'` for singletons when using `@Injectable()`

## Forms

### Signal Forms (stable as of v22 — prefer for new forms)
- Signal Forms (`@angular/forms/signals`) are production-ready — use for all new forms
- Import: `form`, `FormField`, `required`, `email`, `minDate`, `maxDate` from `@angular/forms/signals`
- Use `getError()` for typed error access — returns properly-typed errors, not `any`
- Supports async validation, debounce on blur, custom controls, Angular Material/Aria integration

### Reactive Forms (legacy — existing forms)
- Keep existing Reactive Forms as-is; migrate incrementally when appropriate
- Drive loading/disabled state with signals
- Disable submit during `isLoading()` to prevent double submit
- NEVER store JWT in localStorage

## HTTP Client
- **Fetch API is the default in v22** — `withFetch()` is no longer needed in providers; remove it if present
- Use `httpResource()` for declarative, signal-reactive HTTP fetching
- Functional interceptors (`HttpInterceptorFn`) for auth — never class-based interceptors
- `rxResource()` and `httpResource()` subscription leaks are fixed in v22

## Router
- **`paramsInheritanceStrategy` defaults to `'always'` in v22** — child routes inherit params from ALL parent routes automatically
- Bind route params directly as signal inputs: `readonly id = input.required<string>()` — no need to subscribe to `ActivatedRoute`
- To restore old behavior: `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })`
- Avoid `route.parent?.parent?.snapshot.params` chains — params are available directly

## TypeScript 6 (Required by Angular 22)
- **Angular 22 requires TypeScript 6** — do not use TS 5.x-only patterns
- `strictTemplates` is now enabled by default — no need to add it in `tsconfig.json`
- Use `satisfies` operator for type-safe object literals without widening
- Use `noUncheckedSideEffectImports` for stricter side-effect import checking
- NEVER use `any` — use `unknown` when type is uncertain
- NEVER use `@ts-ignore`
- Prefer type inference when obvious

## Templates (v22 Improvements)
- **Spread/rest syntax** is now supported in templates: `{{ fn(...signal(), arg) }}`, `[attr]="{ ...defaults(), extra: true }"`
- **Arrow functions** are valid in event bindings for simple mutations: `(click)="list.update(l => [...l, item()])"`  (keep non-trivial logic in the class)
- **Exhaustive `@switch`** — use `@default never;` to cause a build failure when a union member is unhandled
- **Comments inside HTML elements** are now valid: `<div <!-- accessible label --> role="region">`
- Keep templates simple — push complex logic to the component class

## CRUD Lists & Bulk Operations
- All list components MUST extend `CrudListBase<TEntity>` (`src/app/shared/crud-list-base.ts`) — it is the single source of truth for pagination, filtering, soft-delete and selection
- NEVER reimplement row selection or bulk logic per feature — use the base's `selectedIds`, `toggleSelect`, `toggleSelectAll`, `clearSelection`, `isSelected`, `selectedCount`, `hasSelection`, `allSelected`, `someSelected`, `onBulkDelete`, `onBulkRestore`
- When the backend exposes bulk endpoints, the feature service MUST expose `bulkDelete(dto: BulkIdsDto)` and/or `bulkRestore(dto: BulkIdsDto)` (`BulkIdsDto = { ids: string[] }`)
- Every soft-delete CRUD list MUST render a select-all header checkbox, per-row checkboxes, and a bulk-actions bar — all gated on the base's `supportsBulk` getter so read-only resources (e.g. activity-logs) auto-hide them
- Bulk actions MUST be **context-aware**: gate "Delete selected" on `hasSelectedActive()` and "Restore selected" on `hasSelectedTrashed()` so each button only appears when relevant. `onBulkDelete`/`onBulkRestore` act only on the relevant subset
- Bulk delete MUST confirm before acting; both bulk actions clear selection and reload on success (handled by the base)
- Empty-state colspan MUST be `tableColumns.length + (supportsBulk ? 2 : 1)`
- Checkbox / bulk-bar styling MUST use `.crud-checkbox`, `.select-col`, `.bulk-actions-bar`, `.btn-bulk*` token classes — never hardcode

## Styling
- Use PrimeNG **v21** styled theming (`@primeuix/themes` + `cssLayer`); attach `styles.css` classes via the Pass Through API — **no PrimeNG v22 yet**
- Map styles.css tokens to PrimeNG components via `pt` configuration
- NEVER use hex values — ALWAYS use CSS custom properties
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
- Use environment variables for all external service URLs (this app reads `NG_APP_*` from `import.meta.env`)
- When reading `import.meta.env`, use a typed accessor — NEVER `as any` (see `app.config.ts` for the `any`-free pattern)
- Add all required environment variables to `.env.example`

## Accessibility
- MUST pass all AXE checks
- MUST follow WCAG AA minimums (focus management, color contrast, ARIA attributes)
- Implement proper focus management for interactive elements
- Ensure keyboard navigation works for all interactive components
- **Angular Aria (`@angular/aria`) is stable in v22** — use it for accessible headless components with test harnesses

## Testing
- The project uses **Vitest** (`vitest` + `jsdom`) — run with `npm test`. Playwright is NOT installed.
- Write focused unit/component tests for logic and user flows (Login → Create → Delete)
- Don't over-test trivial components
- Use `--isolate` flag for Vitest native isolation (separate threads/processes)
- Use `--quiet` flag to suppress build summary in watch mode (`true` locally, `false` in CI by default)

## Performance
- Signals drive change detection in this zoneless app — keep state in signals
- OnPush is the default in v22 — omit it in new components (it's already active)
- Use `@defer` for lazy loading
- Use `NgOptimizedImage` for images
- Use `injectAsync()` to code-split services that are only needed on certain routes/interactions
- `httpResource()` + Fetch API enables streaming responses out of the box
