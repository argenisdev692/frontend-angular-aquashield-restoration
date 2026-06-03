# Angular Module from API Command

## Description
Generate a complete Angular feature module from the generated API in `src/app/api`. Examines the ng-openapi-gen structure (services, models, functions) to create typed frontend code with CRUD operations.

## Usage
```
Create a feature module for [module-name] from API
```

## Steps

1. **Examine the API structure in `src/app/api`**:
   - Check `src/app/api/services/` for the corresponding service (e.g., `auth.service.ts` for "auth", `users.service.ts` for "users")
   - Check `src/app/api/models/` for the TypeScript interfaces/types (e.g., `UserResponse`, `CreateUserDto`, `UpdateUserDto`)
   - Check `src/app/api/fn/` for the individual API functions
   - Check `src/app/api/api-configuration.ts` for the API configuration

2. **Analyze the service methods**:
   - List all available methods in the service
   - Identify CRUD methods: getAll/find-all, getById/find-one, create, update, delete/remove
   - Identify input parameters and return types
   - Note the method names and their purposes

3. **Analyze the models**:
   - Identify the main entity interface (e.g., `UserResponse`)
   - Identify DTOs for create/update operations (e.g., `CreateUserDto`, `UpdateUserDto`)
   - Note any nested types or enums
   - List all fields available in each type

4. **Generate the feature module** based on the API structure

## Generated Structure
```
src/app/features/[feature]/
├── components/
│   ├── [feature]-list.component.ts
│   ├── [feature]-form.component.ts
│   └── [feature]-detail.component.ts
├── services/
│   └── [feature].service.ts (wraps the generated API service)
├── models/
│   └── [feature].types.ts (re-exports from api/models)
└── [feature].routes.ts
```

## Service Generation
- Wraps the generated API service from `src/app/api/services/`
- Maps the generated methods to convenient CRUD methods
- Uses the generated types from `src/app/api/models/`
- Implements error handling
- Returns Promises (configured in ng-openapi-gen)

## Component Generation
- List component with resource/rxResource using the generated service
- Form component with Reactive Forms using generated DTOs
- Detail component with computed signals using generated types
- All components use PrimeNG unstyled with Pass Through
- All components use standalone Angular 21 syntax

## Type Generation
- Re-exports TypeScript interfaces from `src/app/api/models/`
- Uses the generated types for all API calls
- No need for Zod validation (types are already generated from OpenAPI)

## Example Output
```typescript
// service wrapper
import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { UsersService } from '../../api/services/users.service';
import { UserResponse, CreateUserDto, UpdateUserDto } from '../../api/models';

@Injectable({ providedIn: 'root' })
export class UsersFeatureService {
  private usersService = inject(UsersService);

  getAll() {
    return this.usersService.usersControllerFindAll();
  }

  getById(id: string) {
    return this.usersService.usersControllerFindOne({ id });
  }

  create(dto: CreateUserDto) {
    return this.usersService.usersControllerCreate(dto);
  }

  update(id: string, dto: UpdateUserDto) {
    return this.usersService.usersControllerUpdate({ id, body: dto });
  }

  delete(id: string) {
    return this.usersService.usersControllerRemove({ id });
  }
}

// list component
import { Component, inject } from '@angular/core';
import { resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { UsersFeatureService } from '../services/users.service';
import { UserResponse } from '../../api/models';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  template: `
    <div class="card-modern p-4">
      <p-table 
        [value]="usersResource.value() || []"
        [pt]="{ root: '!bg-transparent !border-transparent' }"
      >
        <ng-template pTemplate="header">
          <tr>
            <th *ngFor="let field of fields">{{ field }}</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-user>
          <tr>
            <td *ngFor="let field of fields">{{ user[field] }}</td>
            <td>
              <button pButton icon="pi pi-eye" class="btn-action btn-action-view" />
              <button pButton icon="pi pi-pencil" class="btn-action btn-action-edit" />
              <button pButton icon="pi pi-trash" class="btn-action btn-action-delete" />
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class UsersListComponent {
  private service = inject(UsersFeatureService);

  usersResource = resource({
    loader: () => this.service.getAll()
  });

  fields = ['id', 'name', 'email']; // fields from UserResponse

  deleteUser(id: string) {
    this.service.delete(id).then(() => {
      this.usersResource.reload();
    });
  }
}
```

## Best Practices Applied
- Uses generated API services from ng-openapi-gen
- Uses generated types from OpenAPI spec
- Resource/rxResource for async operations
- Signals for loading states
- Reactive Forms with validation
- PrimeNG unstyled with Pass Through
- styles.css styling tokens
- Type-safe API calls
- Standalone components (Angular 21)
