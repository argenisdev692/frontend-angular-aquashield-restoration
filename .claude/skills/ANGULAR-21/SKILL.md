# Angular 22 Development Skill (2026)

## Overview
Expert in Angular 22 with Standalone Components (default), Signals, native control flow, and **zoneless** change detection (`provideZonelessChangeDetection()` is enabled in this project).

**Requires: TypeScript 6, Node 22+. PrimeNG stays at v21 (no v22 yet).**

## Core Competencies

### Standalone Components
- Components are standalone **by default** — NEVER write `standalone: true` (redundant in v22).
- Only import what the template uses. Do NOT import `CommonModule` — `@if`/`@for`/`@switch` are built in.
- Use `input()` / `output()` functions, never `@Input()` / `@Output()`.
- Use `@defer` for lazy loading heavy UI.

### Change Detection (v22)
- **OnPush is the DEFAULT** — do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` in new components (redundant).
- **`ChangeDetectionStrategy.Default` is `@deprecated` in v22** — it is now an alias for `ChangeDetectionStrategy.Eager` (`Default: ChangeDetectionStrategy.Eager`) and is **due to be removed**. Use `Eager`; migrate any existing code that referenced `Default`.
- Existing explicit `OnPush` in the codebase is safe to keep.
- Components that need legacy eager detection: `changeDetection: ChangeDetectionStrategy.Eager`.
- This app is **zoneless**: all UI updates must flow through signals.

### Signals & State (zoneless)
- `signal()` for local state, `computed()` for derived state, `effect()` for side effects.
- `debounced()` for debouncing signal values (new stable in v22).
- `resource()` for **Promise**-returning async; `rxResource()` for **Observable**-returning async.
- `httpResource()` for HTTP data fetching — **stable as of v22**.
- Never use `mutate()` — use `update()` or `set()`.

### HTTP Client (v22)
- **Fetch API is now the default** — remove `withFetch()` from app config if present.
- Use `httpResource()` for declarative signal-based HTTP fetching.
- `rxResource()` and `httpResource()` subscription leaks are fixed in v22.

### Router (v22)
- `paramsInheritanceStrategy` defaults to `'always'` — child routes inherit params from ALL parent routes.
- Bind route params as signal inputs: `readonly id = input.required<string>()` — no `ActivatedRoute` subscription needed.
- To restore old behavior: `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })`.

### Dependency Injection (v22)
- Use `inject()` — never constructor injection.
- **`@Service()` decorator** (stable in v22) — use instead of `@Injectable({ providedIn: 'root' })` for new singleton services.
- **`injectAsync()`** — lazy, code-split service injection; loads the service only when actually called at runtime.
- `@Injectable()` still available for non-root provider scopes.

### TypeScript 6
- Angular 22 requires TypeScript 6.
- `strictTemplates` is enabled by default.
- Use `satisfies` for type-safe object literals.
- NEVER use `any` — use `unknown` and narrow.

### Signal Forms (Stable in v22)
Signal Forms are production-ready. Prefer for all new forms:
```typescript
import { form, FormField, required, email, minDate } from '@angular/forms/signals';

const loginForm = form({
  email: FormField.required(email()),
  password: FormField.required()
});

// Typed error access
const err = loginForm.controls.email.getError('email'); // typed, not 'any'
```

### Template Improvements (v22)
- **Spread syntax**: `{{ fn(...prices(), tax()) }}`, `[obj]="{ ...defaults(), extra: true }"`
- **Arrow functions in event bindings**: `(click)="items.update(l => [...l, item()])"`
- **Exhaustive `@switch`**: add `@default never;` to get a build error when a union case is missing
- **Comments inside elements**: `<div <!-- label --> role="region">` is now valid

## Common Patterns

### New Service (v22 — @Service decorator)
```typescript
import { Service } from '@angular/core';

@Service()
export class AuthService {
  private readonly token = signal<string | null>(null);

  setToken(t: string): void { this.token.set(t); }
  getToken() { return this.token.asReadonly(); }
}
```

### Lazy Service with injectAsync (v22)
```typescript
import { injectAsync } from '@angular/core';
import { HeavyAnalyticsService } from './heavy-analytics.service';

@Component({ /* ... */ })
export class DashboardComponent {
  private getAnalytics = injectAsync(() =>
    import('./heavy-analytics.service').then(m => m.HeavyAnalyticsService)
  );

  async trackEvent(name: string): Promise<void> {
    const svc = await this.getAnalytics();
    svc.track(name);
  }
}
```

### Component with Signals (no OnPush needed — it's the v22 default)
```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-counter',
  // No changeDetection needed — OnPush is the v22 default
  template: `
    <p>Count: {{ count() }}</p>
    <p>Doubled: {{ doubled() }}</p>
    <button (click)="count.update(c => c + 1)">Increment</button>
  `
})
export class CounterComponent {
  readonly count = signal(0);
  readonly doubled = computed(() => this.count() * 2);
}
```

### httpResource() — Stable HTTP + Signal Fetching (v22)
```typescript
import { Component, input } from '@angular/core';
import { httpResource } from '@angular/common/http';

@Component({
  selector: 'app-user-detail',
  template: `
    @if (userResource.isLoading()) {
      <p>Loading...</p>
    } @else if (userResource.error()) {
      <p>Could not load user</p>
    } @else {
      <h2>{{ userResource.value()?.name }}</h2>
    }
  `
})
export class UserDetailComponent {
  // paramsInheritanceStrategy: 'always' (v22 default) — parent params available directly
  readonly userId = input.required<string>();

  // Re-fetches automatically when userId changes
  readonly userResource = httpResource(() => `/api/users/${this.userId()}`);
}
```

### resource() — Promise loader (ng-openapi-gen `--promises true`)
```typescript
import { Component, inject, resource } from '@angular/core';

@Component({
  selector: 'app-product-list',
  template: `
    @if (productsResource.isLoading()) { <p>Loading...</p> }
    @else if (productsResource.error()) { <p>Error</p> }
    @else {
      <ul>
        @for (product of productsResource.value(); track product.id) {
          <li>{{ product.name }}</li>
        } @empty { <li>No products</li> }
      </ul>
    }
  `
})
export class ProductListComponent {
  private productService = inject(ProductService);
  productsResource = resource({ loader: () => this.productService.getAll() });
}
```

### Reactive Form with Signals (existing pattern — still supported)
```typescript
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
      <input formControlName="email" type="email" />
      @if (loginForm.controls.email.invalid && loginForm.controls.email.touched) {
        <small>Invalid email</small>
      }
      <button type="submit" [disabled]="loginForm.invalid || isLoading()">Login</button>
    </form>
  `
})
export class LoginComponent {
  readonly isLoading = signal(false);
  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);
  }
}
```

### Exhaustive @switch (v22)
```typescript
// @default never; causes a build error if a union case is not handled
type Status = 'active' | 'trashed' | 'archived';

// In template:
// @switch (status()) {
//   @case ('active') { <span>Active</span> }
//   @case ('trashed') { <span>Deleted</span> }
//   @case ('archived') { <span>Archived</span> }
//   @default { never; }   ← build fails if Status gets a new member
// }
```

## Best Practices
- Standalone is the default — never write `standalone: true`.
- Don't import `CommonModule` — use `@if`/`@for`/`@switch`.
- Prefer signals over RxJS for UI state (zoneless app).
- `inject()` over constructor injection.
- **No explicit OnPush in new components** — it's the default; setting it is noise.
- `@Service()` over `@Injectable({ providedIn: 'root' })` for new singletons.
- `resource()`/`rxResource()`/`httpResource()` for async — all stable in v22.
- `withFetch()` is no longer needed — Fetch is the default HTTP transport.
- Router params are inherited from all parents by default — use `input.required<string>()`.
- Never use `any` — use `unknown` and narrow.
- Follow the official Angular 22 docs at angular.dev for the latest APIs.
