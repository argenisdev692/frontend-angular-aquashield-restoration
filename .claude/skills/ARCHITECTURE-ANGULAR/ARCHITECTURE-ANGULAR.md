---
trigger: always_on
---

# Angular 22 Clean Architecture

> **Authority**: SINGLE SOURCE OF TRUTH for Angular 22 project structure and organization.
> **Scope**: Feature-based architecture, separation of concerns, scalability patterns.

## Directory Structure

All application code lives under `src/app/` (Angular CLI default):

```
src/
├── app/
│   ├── api/               # ng-openapi-gen output: services, models, fn, interceptors
│   ├── features/          # Feature modules (business logic) — e.g. auth/
│   ├── shared/            # Shared UI components, pipes, directives
│   ├── components/        # App-level shared components
│   ├── pages/             # Routed page components
│   ├── app.config.ts      # Providers: PrimeNG theme, HTTP, router, zoneless CD
│   ├── app.routes.ts      # Root routing
│   └── app.ts             # Root component
├── assets/                # Static assets (images, fonts)
├── server.ts              # Express + @angular/ssr (set security headers here)
└── styles.css             # Global styles with design tokens
```

> Optional growth: introduce `core/` (singletons/guards), `models/`, `utils/` under `src/app/` when needed. Generated API code stays in `src/app/api/` — do not edit it by hand.

## §1: App Directory (`src/app/`)
- **Purpose:** root of all application code — routing and component orchestration
- **Rules:**
  - `app/` is the sole orchestrator - imports from everywhere
  - `app.config.ts` registers providers, including `provideZonelessChangeDetection()`
  - Route configuration in `app.routes.ts`
  - Lazy load features via `loadComponent` or standalone imports
  - Keep route components focused on composition
  - Extract complex logic to services in `core/` or `features/`
  - Use `@defer` for lazy loading heavy components
  - Layout components for shared UI (sidebar, header)

## §2: Core Directory (`src/app/core/`, optional)
- **Purpose:** Singleton services and application-wide concerns
- **Structure:**
  ```
  src/app/core/
  ├── interceptors/     # Functional HTTP interceptors
  ├── guards/           # Route guards (canActivate, canLoad)
  ├── services/         # Singleton services (auth, theme, error handling)
  └── models/           # Core domain models
  ```
- **Rules:**
  - All services use `providedIn: 'root'`
  - Functional interceptors for HTTP
  - Global error handler
  - Authentication service (HttpOnly cookies or in-memory)
  - Theme service for dark/light mode

## §3: Features Directory (`src/app/features/`)
- **Purpose:** Feature modules with business logic
- **Structure:**
  ```
  src/app/features/{feature-name}/
  ├── components/       # Feature-specific components
  ├── services/         # Feature-specific services
  ├── models/           # Feature-specific interfaces/types
  └── {feature}.routes.ts  # Feature routing configuration
  ```
- **Rules:**
  - Each feature is self-contained
  - Components are standalone
  - Services use `providedIn: 'root'` or feature-specific
  - Lazy load feature routes
  - No circular dependencies between features

## §4: Shared Directory (`src/app/shared/`)
- **Purpose:** Reusable UI components, pipes, directives
- **Structure:**
  ```
  src/app/shared/
  ├── components/       # Reusable UI components
  ├── pipes/            # Custom pipes
  ├── directives/       # Custom directives
  └── ui/               # PrimeNG themed wrappers
  ```
- **Rules:**
  - All components are standalone (never write `standalone: true`)
  - Use PrimeNG v21 styled theming with Pass Through
  - Map styles.css tokens via pt configuration
  - Components should be framework-agnostic where possible

## §5: Models Directory (`src/app/models/`, optional)
- **Purpose:** Global TypeScript interfaces and types
- **Rules:**
  - Shared domain models across features
  - Use Zod schemas for runtime validation
  - Export interfaces and types
  - Keep models simple and focused

## §6: Utils Directory (`src/app/utils/`, optional)
- **Purpose:** Shared utilities and helper functions
- **Rules:**
  - Pure functions where possible
  - No Angular dependencies
  - Export named functions
  - Unit testable

## §7: Config Files (`src/app/`)
- **Purpose:** Angular configuration (files, not a separate directory)
- **Files:**
  - `app.config.ts` - Application providers (PrimeNG theme, HTTP, router, zoneless CD)
  - `app.config.server.ts` - SSR-specific providers
  - `app.routes.ts` / `app.routes.server.ts` - routing
- **Rules:**
  - Configure PrimeNG v21 styled theming (`@primeuix/themes` + `cssLayer`)
  - Configure functional interceptors via `withInterceptors([...])`
  - Keep configuration minimal

## Component Organization

### Standalone Component Structure
```typescript
// src/app/features/auth/components/login/login.component.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule], // no CommonModule — control flow is built in
  template: `...`
})
export class LoginComponent {
  private authService = inject(AuthService);
  isLoading = signal(false);
  // ...
}
```

### Service Organization
```typescript
// src/app/features/auth/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  
  login(credentials: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', credentials);
  }
}
```

## Routing Patterns

### Lazy Loading Features
```typescript
// src/app/app.routes.ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/components/home/home.component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes')
      .then(m => m.AUTH_ROUTES)
  }
];
```

### Feature Routes
```typescript
// src/app/features/auth/auth.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent }
];
```

## Best Practices

### Component Rules
- All components are standalone — NEVER write `standalone: true` (v22 default)
- Don't import `CommonModule` for control flow — `@if`/`@for`/`@switch` are built in
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in @Component decorator (OnPush is the v22 default; still set explicitly for clarity)
- Use `input()` and `output()` functions instead of decorators
- Use signals for state management
- Use `computed()` for derived state
- Use native control flow (`@if`, `@for`, `@switch`)
- Use `@defer` for lazy loading
- Use `inject()` instead of constructor injection

### Service Rules
- Use `providedIn: 'root'` for singletons
- Use `inject()` for dependency injection
- Keep services focused on single responsibility
- Return Observables for async operations
- Use functional interceptors for HTTP

### File Naming
- Components: `*.component.ts`
- Services: `*.service.ts`
- Pipes: `*.pipe.ts`
- Directives: `*.directive.ts`
- Models: `*.interface.ts` or `*.type.ts`
- Routes: `*.routes.ts`
- Use kebab-case for file names
- Use PascalCase for class names

### Import Organization
```typescript
// 1. Angular imports
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

// 2. Third-party imports
import { ButtonModule } from 'primeng/button';

// 3. Internal imports
import { AuthService } from '../../services/auth.service';
import { LoginDto } from '../../models/login.dto';
```

## Anti-Patterns to Avoid

- ❌ NEVER use NgModules
- ❌ NEVER use `@HostBinding`/`@HostListener` - use host object
- ❌ NEVER use `ngClass`/`ngStyle` - use class/style bindings
- ❌ NEVER use `*ngIf`/`*ngFor`/`*ngSwitch` - use `@if`/`@for`/`@switch`
- ❌ NEVER store JWT in localStorage
- ❌ NEVER use constructor injection - use `inject()`
- ❌ NEVER create circular dependencies
- ❌ NEVER put business logic in components - use services
- ❌ NEVER set `changeDetection: ChangeDetectionStrategy.OnPush` in new components — it's the v22 default
- ❌ NEVER use `ChangeDetectionStrategy.Default` — it is `@deprecated` in v22 (an alias for `Eager`, due to be removed); use `ChangeDetectionStrategy.Eager`
- ❌ NEVER use `withFetch()` — Fetch is the default HTTP transport in v22
- ❌ NEVER use `@Injectable({ providedIn: 'root' })` for new services — use `@Service()` instead
- ❌ NEVER use `any` — TypeScript 6 strict mode; use `unknown` and narrow
