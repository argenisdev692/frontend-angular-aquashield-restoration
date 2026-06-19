# Angular New Component Command

## Description
Create a new Angular 22 standalone component with proper structure and best practices.

## Usage
```
Create a new component for [feature] with [specific functionality]
```

## Generated Structure
```
src/app/features/[feature]/
├── components/
│   └── [component-name].component.ts
├── services/
│   └── [service-name].service.ts
└── models/
    └── [model-name].ts
```

## Component Template
```typescript
import { Component, signal, computed, inject } from '@angular/core';

@Component({
  selector: 'app-[component-name]',
  // No changeDetection needed — OnPush is the v22 default
  // imports: only what the template uses (e.g. ReactiveFormsModule, a PrimeNG module) — NOT CommonModule
  template: `
    <div class="card-modern">
      <!-- Use @if/@for/@switch for control flow -->
    </div>
  `
})
export class [ComponentName]Component {
  // Services — use @Service() for new singletons
  private readonly service = inject(ServiceName);

  // State
  private readonly state = signal<StateType>(initialState);

  // Derived state (prefer computed over ngOnInit for reactive setup)
  readonly computedValue = computed(() => this.state().property);
}
```

## Service Template (v22 — prefer @Service decorator)
```typescript
import { Service, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';

@Service()
export class [FeatureName]Service {
  // @Service() = @Injectable({ providedIn: 'root' }) shorthand
}
```

## Best Practices Applied
- Standalone component — never write `standalone: true` (v22 default)
- **No explicit `changeDetection`** — OnPush is the v22 default; omit for new components
- `ChangeDetectionStrategy.Default` is `@deprecated` in v22 (now an alias for `Eager`, due to be removed) — use `ChangeDetectionStrategy.Eager` and migrate any code referencing `Default`
- No `CommonModule`; native control flow (`@if`/`@for`/`@switch`)
- Uses `inject()` for dependency injection
- Prefers `@Service()` over `@Injectable({ providedIn: 'root' })` for new services
- Follows styles.css styling conventions and PrimeNG **v21** styled theming (no v22 yet)
- Signal Forms (`@angular/forms/signals`) for new forms — stable in v22
