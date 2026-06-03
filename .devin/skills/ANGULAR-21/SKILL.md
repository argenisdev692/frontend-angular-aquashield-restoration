# Angular 21 Development Skill

## Overview
Expert in Angular 21 development with Standalone Components, Signals, and modern Angular patterns.

## Core Competencies

### Standalone Components
- Create standalone components by default (no NgModules)
- Use `input()` and `output()` functions instead of decorators
- Implement lazy loading with `@defer`
- Use native control flow (`@if`, `@for`, `@switch`)

### Signals & State Management
- Use `signal()` for local state
- Use `computed()` for derived state
- Use `effect()` for side effects
- Use `resource()` and `rxResource()` for async data fetching
- Never use `mutate()` - use `update()` or `set()`

### Dependency Injection
- Use `inject()` function instead of constructor injection
- Use `providedIn: 'root'` for singleton services
- Use functional interceptors for HTTP

### Forms
- Implement Reactive Forms with Signals
- Add validation with Signals
- Handle async validation

### Performance
- Signals automatically handle change detection
- Use `@defer` for lazy loading components
- Use `NgOptimizedImage` for static images

## Common Patterns

### Component with Signals
```typescript
import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p>Count: {{ count() }}</p>
      <p>Doubled: {{ doubled() }}</p>
      <button (click)="increment()">Increment</button>
    </div>
  `
})
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  increment() {
    this.count.update(c => c + 1);
  }
}
```

### Resource for Data Fetching
```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (productsResource.isPending()) {
      <p>Loading...</p>
    } @else if (productsResource.hasError()) {
      <p>Error loading products</p>
    } @else {
      <ul>
        @for (product of productsResource.value(); track product.id) {
          <li>{{ product.name }}</li>
        }
      </ul>
    }
  `
})
export class ProductListComponent {
  productService = inject(ProductService);

  productsResource = resource({
    loader: () => this.productService.getAll()
  });
}
```

### Reactive Form with Signals
```typescript
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
      <input formControlName="email" type="email" />
      @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
        <small>Email inválido</small>
      }
      <button [disabled]="loginForm.invalid || isLoading()">Login</button>
    </form>
  `
})
export class LoginComponent {
  isLoading = signal(false);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      // Auth logic
    }
  }
}
```

## Best Practices
- Always use standalone components
- Prefer signals over RxJS for UI state
- Use native control flow instead of structural directives
- Use `inject()` instead of constructor injection
- Never use `any` type
- Follow Angular 21 documentation for latest APIs
