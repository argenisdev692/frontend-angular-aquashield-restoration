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
   - Identify **bulk** methods: bulkDelete (`*ControllerBulkDelete`), bulkRestore (`*ControllerBulkRestore`) — take a `BulkIdsDto` (`{ ids: string[] }`)
   - Identify soft-delete methods: restore (`*ControllerRestore`), findTrash
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
- List component with resource/rxResource (or httpResource for HTTP endpoints) using the generated service
- Form component with Reactive Forms or Signal Forms (`@angular/forms/signals`) using generated DTOs
- Detail component reads its `:id` via `input.required<string>()` (NOT `route.snapshot`) and exposes all template-derived state as `computed()` signals
- All components use PrimeNG **v21** styled theming with Pass Through (no v22 yet)
- All components use standalone Angular 22 syntax
- See **Mandatory Angular 22 Rules** below — they are enforced by `/ANGULAR-AUDIT`

## Type Generation
- Re-exports TypeScript interfaces from `src/app/api/models/`
- Uses the generated types for all API calls
- Generated types give **compile-time** safety only. For trust-boundary data (auth responses, anything rendered as HTML, money/permissions), still validate the **runtime** shape (e.g. Zod) per the OWASP skill.

## Example Output
```typescript
// service wrapper
import { Service, inject } from '@angular/core';
import { UsersService } from '../../api/services/users.service';
import { UserResponse, CreateUserDto, UpdateUserDto } from '../../api/models';

// v22: use @Service() for new singletons — NOT @Injectable({ providedIn: 'root' })
@Service()
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

  // Soft-delete restore (if the API exposes it)
  restore(id: string) {
    return this.usersService.usersControllerRestore({ id });
  }

  // Bulk operations — REQUIRED whenever the API exposes them.
  // Both take BulkIdsDto = { ids: string[] }. CrudListBase wires the
  // checkbox selection UI automatically when these methods exist.
  bulkDelete(dto: BulkIdsDto) {
    return this.usersService.usersControllerBulkDelete({ body: dto });
  }

  bulkRestore(dto: BulkIdsDto) {
    return this.usersService.usersControllerBulkRestore({ body: dto });
  }
}

// list component
import { Component, inject, resource } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { UsersFeatureService } from '../services/users.service';

@Component({
  selector: 'app-users-list',
  // No changeDetection — OnPush is the v22 default; setting it is redundant
  imports: [TableModule, ButtonModule], // no CommonModule — control flow is built in
  template: `
    <div class="card-modern p-4">
      <p-table [value]="usersResource.value() ?? []" [pt]="{ root: '!bg-transparent !border-transparent' }">
        <ng-template pTemplate="header">
          <tr>
            @for (field of fields; track field) {
              <th>{{ field }}</th>
            }
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-user>
          <tr>
            @for (field of fields; track field) {
              <td>{{ user[field] }}</td>
            }
            <td>
              <button pButton icon="pi pi-eye" class="btn-action btn-action-view" aria-label="View"></button>
              <button pButton icon="pi pi-pencil" class="btn-action btn-action-edit" aria-label="Edit"></button>
              <button pButton icon="pi pi-trash" class="btn-action btn-action-delete" aria-label="Delete"
                      (click)="deleteUser(user.id)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class UsersListComponent {
  private readonly service = inject(UsersFeatureService);

  // loader returns a Promise (ng-openapi-gen --promises true)
  readonly usersResource = resource({
    loader: () => this.service.getAll()
  });

  readonly fields = ['id', 'name', 'email']; // fields from UserResponse

  async deleteUser(id: string): Promise<void> {
    await this.service.delete(id);
    this.usersResource.reload();
  }
}
```

## Bulk Operations & Row Selection (REQUIRED for soft-delete CRUDs)

List components extend `CrudListBase<TEntity>` (`src/app/shared/crud-list-base.ts`), which provides the **single source of truth** for selection + bulk actions. Do NOT reimplement selection per-feature.

### What the base provides (no per-feature code needed)
- `selectedIds` signal + `isSelected(id)`, `toggleSelect(id)`, `toggleSelectAll()`, `clearSelection()`
- `selectedCount()`, `hasSelection()`, `allSelected()`, `someSelected()` (computed)
- `onBulkDelete()` / `onBulkRestore()` — call `service.bulkDelete/bulkRestore({ ids })`, then clear + reload
- `supportsBulk` / `supportsBulkDelete` / `supportsBulkRestore` getters — `true` only when the feature service exposes the matching method, so the checkbox column and bulk bar **auto-hide** for read-only resources (e.g. activity-logs)
- `hasSelectedActive()` / `hasSelectedTrashed()` — context-aware gating so "Delete selected" only shows when active rows are selected and "Restore selected" only shows when trashed rows are selected; `onBulkDelete`/`onBulkRestore` act on only the relevant subset
- Selection is cleared automatically on filter and page changes

### Wiring requirement
1. **Feature service** must expose `bulkDelete(dto: BulkIdsDto)` / `bulkRestore(dto: BulkIdsDto)` (see service example above). The base's `CrudListService` interface declares them optional.
2. **List template** must render the selection column + bulk bar, gated on `supportsBulk`:

```html
<!-- Bulk action bar (above the table card) -->
@if (supportsBulk && hasSelection()) {
  <div class="bulk-actions-bar">
    <span class="bulk-count">{{ selectedCount() }} selected</span>
    <div class="bulk-actions">
      @if (supportsBulkDelete && hasSelectedActive()) {
        <button class="btn-bulk btn-bulk-delete" type="button" (click)="onBulkDelete()">…Delete selected</button>
      }
      @if (supportsBulkRestore && hasSelectedTrashed()) {
        <button class="btn-bulk btn-bulk-restore" type="button" (click)="onBulkRestore()">…Restore selected</button>
      }
      <button class="btn-bulk btn-bulk-clear" type="button" (click)="clearSelection()">Clear</button>
    </div>
  </div>
}

<!-- Header checkbox -->
@if (supportsBulk) {
  <th class="select-col">
    <input type="checkbox" class="crud-checkbox"
      [checked]="allSelected()" [indeterminate]="someSelected()"
      (change)="toggleSelectAll()" aria-label="Select all" />
  </th>
}

<!-- Row checkbox -->
@if (supportsBulk) {
  <td class="select-col">
    <input type="checkbox" class="crud-checkbox"
      [checked]="isSelected(row.id)" (change)="toggleSelect(row.id)"
      [attr.aria-label]="'Select ' + row.name" />
  </td>
}
```

3. **Empty-state colspan** must account for the selection column:
   `[attr.colspan]="tableColumns.length + (supportsBulk ? 2 : 1)"`
4. Styling uses the shared `.crud-checkbox`, `.select-col`, `.bulk-actions-bar`, `.btn-bulk*` tokens in `styles.css` — never hardcode checkbox styling.

## Mandatory Angular 22 Rules (enforce in every generated file)

These are non-negotiable. The audit checklist (`/ANGULAR-AUDIT`) flags any violation.

### Components
- **NEVER** set `changeDetection: ChangeDetectionStrategy.OnPush` — it is the v22 default. Do not import `ChangeDetectionStrategy` just to set it.
- **NEVER** write `standalone: true` (default in v22).
- Use `inject()`, `input()`/`output()`, signals, native control flow (`@if`/`@for`/`@switch`).
- **Detail components: read route params with a signal input, NOT `route.snapshot`.**
  `withComponentInputBinding()` is enabled in `app.config.ts`, so:
  ```typescript
  readonly id = input.required<string>();
  readonly entityResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.service.getById(params),
  });
  ```
- **All template-derived state in a detail component is a `computed()`**, not a method
  (`title`, `duration`, `isDeleted`, badge/chip class, …). Per-row helpers in a *list*
  that take a row argument (e.g. `duration(row)`) stay methods — they can't be `computed`.

### Services
- Use `@Service()` (NOT `@Injectable({ providedIn: 'root' })`) for new feature services.
- **Every async action must handle failure** with a `NotificationService` toast — including
  exports and side-effect calls (e.g. `markRead`). A silent `.then()` is a bug:
  ```typescript
  this.api.export({ ...this.buildExportParams(), format: 'csv' })
    .then((blob) => this.downloadBlob(blob, `${this.entityName}.csv`))
    .catch((error) => this.notify.error(error, 'Export failed'));
  ```
- When the generated client discards a binary/non-JSON body (export endpoints typically
  return `responseType: 'text'`/`void`), GET the blob directly via `HttpClient`
  (`responseType: 'blob'`); the auth interceptor still attaches the in-memory Bearer token.

### Types — no `any`
- `extractItems`/`extractTotal` overrides MUST be typed to the paginated envelope, not `any`.
  The base declares `(response: any)`, but a narrower override is allowed by method-parameter
  bivariance:
  ```typescript
  extractItems(response: EntityListResponse | undefined): EntityResponse[] {
    return response?.data ?? [];
  }
  extractTotal(response: EntityListResponse | undefined): number {
    return response?.total ?? 0;
  }
  ```
- Never `any`/`@ts-ignore`/`as unknown as X` — use `unknown` + narrowing.

### Read-only / external-source resources (e.g. Retell calls)
- Routes are list + detail only (no `form` component, no create/edit). Repurpose the
  `advanced-filter` "create" slot for a domain action (e.g. **Sync**) and wire it to your
  own handler, not `onCreate()`.

### Styling
- Presentational token classes shared by list **and** detail (sentiment chips, status
  badges, etc.) live in **`styles.css`** — never duplicate the same block in two component
  CSS files. Only layout that's unique to one component belongs in its `.css`.
- No hex values; use `var(--token)`. Class/style bindings, never `ngClass`/`ngStyle`.

### Accessibility
- Icon-only buttons get an `aria-label` (in addition to `title`); decorative inline SVGs
  get `aria-hidden="true"`.
- Media elements (`<audio>`/`<video>`) get an `aria-label`.

### Testing (Vitest)
- A required signal input cannot be set on a `new`-constructed instance. Use
  `TestBed.createComponent` + `componentRef.setInput('id', …)`. If rendering the template
  pulls in heavy children (sidebar → ThemeService → localStorage), blank the template for
  the test: `TestBed.overrideComponent(Cmp, { set: { template: '', imports: [] } })` and
  assert on the class logic only.

## Best Practices Applied
- Uses generated API services from ng-openapi-gen
- Uses generated types from OpenAPI spec
- resource/rxResource/httpResource for async operations (all stable in v22)
- Signals for loading states
- Reactive Forms or Signal Forms (stable in v22) with validation
- PrimeNG **v21** styled theming with Pass Through (no v22 yet)
- styles.css styling tokens
- Type-safe API calls — TypeScript 6 required
- Standalone components (Angular 22)
