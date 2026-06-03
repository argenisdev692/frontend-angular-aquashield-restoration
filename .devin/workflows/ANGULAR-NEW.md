# Angular New Component Command

## Description
Create a new Angular 21 standalone component with proper structure and best practices.

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
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-[component-name]',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card-modern">
      <!-- Component content -->
    </div>
  `,
  styles: []
})
export class [ComponentName]Component {
  // State
  private state = signal<StateType>(initialState);
  
  // Computed
  readonly computedValue = computed(() => this.state().property);
  
  // Services
  private service = inject(ServiceName);
  
  // Methods
  ngOnInit() {
    // Initialization
  }
}
```

## Best Practices Applied
- Standalone component (no standalone: true needed in v21)
- Uses signals for state management
- Uses inject() for dependency injection
- Uses native control flow in template
- Follows styles.css styling conventions
