---
trigger: always_on
---

# Angular 21 Clean Architecture

> **Authority**: SINGLE SOURCE OF TRUTH for Angular 21 project structure and organization.
> **Scope**: Feature-based architecture, separation of concerns, scalability patterns.

## Directory Structure

```
src/
├── app/              # Angular routing and component orchestration
├── core/             # Singleton services, interceptors, guards
├── features/         # Feature modules (business logic)
├── shared/           # Shared UI components, pipes, directives
├── models/           # Global TypeScript interfaces/types
├── utils/            # Shared utilities, helpers
├── config/           # Angular configuration (app.config.ts, routes)
├── assets/           # Static assets (images, fonts)
└── styles.css        # Global styles with design tokens
```

## §1: App Directory (`src/app/`)
- **Purpose:** Angular routing and component orchestration
- **Rules:**
  - `app/` is the sole orchestrator - imports from everywhere
  - Route configuration in `app.routes.ts`
  - Lazy load features via `loadComponent` or standalone imports
  - Keep route components focused on composition
  - Extract complex logic to services in `core/` or `features/`
  - Use `@defer` for lazy loading heavy components
  - Layout components for shared UI (sidebar, header)

## §2: Core Directory (`src/core/`)
- **Purpose:** Singleton services and application-wide concerns
- **Structure:**
  ```
  src/core/
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

## §3: Features Directory (`src/features/`)
- **Purpose:** Feature modules with business logic
- **Structure:**
  ```
  src/features/{feature-name}/
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

## §4: Shared Directory (`src/shared/`)
- **Purpose:** Reusable UI components, pipes, directives
- **Structure:**
  ```
  src/shared/
  ├── components/       # Reusable UI components
  ├── pipes/            # Custom pipes
  ├── directives/       # Custom directives
  └── ui/               # PrimeNG unstyled wrappers
  ```
- **Rules:**
  - All components are standalone
  - Use PrimeNG unstyled with Pass Through
  - Map styles.css tokens via pt configuration
  - Components should be framework-agnostic where possible

## §5: Models Directory (`src/models/`)
- **Purpose:** Global TypeScript interfaces and types
- **Rules:**
  - Shared domain models across features
  - Use Zod schemas for runtime validation
  - Export interfaces and types
  - Keep models simple and focused

## §6: Utils Directory (`src/utils/`)
- **Purpose:** Shared utilities and helper functions
- **Rules:**
  - Pure functions where possible
  - No Angular dependencies
  - Export named functions
  - Unit testable

## §7: Config Directory (`src/config/`)
- **Purpose:** Angular configuration
- **Files:**
  - `app.config.ts` - Application configuration (PrimeNG, providers)
  - `app.routes.ts` - Root routing configuration
- **Rules:**
  - Configure PrimeNG unstyled mode
  - Configure functional interceptors
  - Configure providers
  - Keep configuration minimal

## Component Organization

### Standalone Component Structure
```typescript
// src/features/auth/components/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule],
  template: `...`,
  styles: []
})
export class LoginComponent {
  private authService = inject(AuthService);
  isLoading = signal(false);
  // ...
}
```

### Service Organization
```typescript
// src/features/auth/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

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
// src/features/auth/auth.routes.ts
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
- All components are standalone (no `standalone: true` needed in v21)
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in @Component decorator
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
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

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
