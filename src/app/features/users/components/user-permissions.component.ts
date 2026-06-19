import {
  Component,
  inject,
  signal,
  computed,
  resource,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';

import { UserPermissionsFeatureService } from '../services/user-permissions-feature.service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { UsersFeatureService } from '../services/users-feature.service';
import { PermissionResponseDto } from '../../../api/models/permission-response-dto';
import { UserPermissionResponseDto } from '../../../api/models/user-permission-response-dto';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

interface PermissionModuleGroup {
  module: string;
  permissions: PermissionResponseDto[];
}

@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CheckboxModule,
    ButtonModule,
    PageHeaderComponent,
    SidebarComponent,
  ],
  template: `
    <app-sidebar
      [visible]="drawerVisible()"
      (visibleChange)="drawerVisible.set($event)"
    ></app-sidebar>

    <div class="permissions-page">
      <app-page-header
        [title]="'Permissions: ' + (user()?.name ?? 'User')"
        subtitle="Manage user permissions by module"
        (menuToggle)="drawerVisible.set(true)"
      />

      <div class="permissions-header">
        <button class="btn-back" (click)="onBack()">
          <i class="pi pi-arrow-left"></i>
          <span>Back to User</span>
        </button>
      </div>

      @if (isLoading()) {
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
          <p>Loading permissions...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <i
            class="pi pi-exclamation-circle"
            style="font-size: 2rem; color: var(--accent-error)"
          ></i>
          <p>{{ error() }}</p>
          <p-button label="Retry" icon="pi pi-refresh" (onClick)="reload()" />
        </div>
      } @else {
        <div class="permissions-grid">
          @for (group of groupedPermissions(); track group.module) {
            <div class="module-card">
              <div class="module-header">
                <h3 class="module-title">{{ group.module }}</h3>
                <span class="module-count">
                  {{ assignedCountInGroup(group) }} / {{ group.permissions.length }}
                </span>
              </div>
              <div class="permission-list">
                @for (perm of group.permissions; track perm.id) {
                  <div class="permission-item">
                    <p-checkbox
                      [inputId]="perm.id"
                      [binary]="true"
                      [ngModel]="isAssigned(perm.id)"
                      (onChange)="togglePermission(perm, $event.checked)"
                      [disabled]="savingId() === perm.id"
                    />
                    <label [for]="perm.id" class="permission-label">
                      <span class="permission-name">{{ perm.name }}</span>
                      @if (perm.description) {
                        <span class="permission-desc">{{ perm.description }}</span>
                      }
                      <span class="permission-action">{{ perm.subject }}:{{ perm.action }}</span>
                    </label>
                    @if (savingId() === perm.id) {
                      <i
                        class="pi pi-spin pi-spinner"
                        style="font-size: 0.875rem; color: var(--accent-primary)"
                      ></i>
                    }
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <i class="pi pi-lock" style="font-size: 2rem; color: var(--text-muted)"></i>
              <p>No permissions available in the system.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .permissions-page {
        padding: var(--space-6);
        max-width: 1200px;
        margin: 0 auto;
      }

      .permissions-header {
        margin-bottom: var(--space-6);
      }

      .btn-back {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        background: transparent;
        color: var(--accent-primary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        font-family: var(--font-sans);
        font-weight: var(--font-medium);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: all var(--transition);
      }

      .btn-back:hover {
        background: var(--bg-hover);
        border-color: var(--border-strong);
      }

      .loading-state,
      .error-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-4);
        padding: var(--space-16);
        color: var(--text-secondary);
      }

      .error-state p {
        color: var(--accent-error);
      }

      .permissions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: var(--space-6);
      }

      .module-card {
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-xl);
        padding: var(--space-5);
      }

      .module-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-4);
        padding-bottom: var(--space-3);
        border-bottom: 1px solid var(--border-subtle);
      }

      .module-title {
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        color: var(--text-primary);
        margin: 0;
        text-transform: capitalize;
      }

      .module-count {
        font-size: var(--text-xs);
        font-weight: var(--font-medium);
        color: var(--text-muted);
        background: var(--bg-subtle);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-md);
      }

      .permission-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .permission-item {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-2) 0;
      }

      .permission-label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        cursor: pointer;
      }

      .permission-name {
        font-size: var(--text-sm);
        font-weight: var(--font-medium);
        color: var(--text-primary);
      }

      .permission-desc {
        font-size: var(--text-xs);
        color: var(--text-muted);
      }

      .permission-action {
        font-size: var(--text-xs);
        color: var(--accent-primary);
        font-family: var(--font-mono);
      }

      @media (max-width: 640px) {
        .permissions-page {
          padding: var(--space-4);
        }

        .permissions-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class UserPermissionsComponent {
  private service = inject(UserPermissionsFeatureService);
  private usersService = inject(UsersFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notify = inject(NotificationService);

  readonly drawerVisible = signal(false);
  readonly userId = signal<string>(this.route.snapshot.params['id']);
  readonly savingId = signal<string | null>(null);

  readonly userResource = resource({
    loader: () => this.usersService.getById(this.userId()),
  });

  readonly allPermissionsResource = resource({
    loader: () => this.service.getAllPermissions(),
  });

  readonly userPermissionsResource = resource({
    loader: () => this.service.getUserPermissions(this.userId()),
  });

  readonly user = computed(() => this.userResource.value());
  readonly allPermissions = computed(() => this.allPermissionsResource.value() ?? []);
  readonly userPermissions = computed(() => this.userPermissionsResource.value() ?? []);

  readonly isLoading = computed(
    () =>
      this.allPermissionsResource.isLoading() ||
      this.userPermissionsResource.isLoading() ||
      this.userResource.isLoading(),
  );

  readonly error = computed(() => {
    if (this.allPermissionsResource.error()) return 'Failed to load system permissions';
    if (this.userPermissionsResource.error()) return 'Failed to load user permissions';
    if (this.userResource.error()) return 'Failed to load user data';
    return null;
  });

  readonly assignedPermissionIds = computed(
    () => new Set(this.userPermissions().map((up) => up.permissionId)),
  );

  readonly groupedPermissions = computed(() => {
    const perms = this.allPermissions();
    const groups = new Map<string, PermissionResponseDto[]>();
    for (const perm of perms) {
      const list = groups.get(perm.module) ?? [];
      list.push(perm);
      groups.set(perm.module, list);
    }
    const result: PermissionModuleGroup[] = [];
    for (const [module, permissions] of groups) {
      result.push({
        module,
        permissions: permissions.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
    return result.sort((a, b) => a.module.localeCompare(b.module));
  });

  isAssigned(permissionId: string): boolean {
    return this.assignedPermissionIds().has(permissionId);
  }

  assignedCountInGroup(group: PermissionModuleGroup): number {
    const assigned = this.assignedPermissionIds();
    return group.permissions.filter((p) => assigned.has(p.id)).length;
  }

  async togglePermission(perm: PermissionResponseDto, checked: boolean): Promise<void> {
    const userId = this.userId();
    this.savingId.set(perm.id);

    try {
      if (checked) {
        await this.service.assignPermission(userId, perm.id);
        this.notify.success('Permission assigned', `${perm.name} has been assigned`);
      } else {
        await this.service.removePermission(userId, perm.id);
        this.notify.success('Permission removed', `${perm.name} has been removed`);
      }
      this.userPermissionsResource.reload();
    } catch (e) {
      this.notify.error(e, `Failed to ${checked ? 'assign' : 'remove'} ${perm.name}`);
    } finally {
      this.savingId.set(null);
    }
  }

  reload(): void {
    this.allPermissionsResource.reload();
    this.userPermissionsResource.reload();
    this.userResource.reload();
  }

  onBack(): void {
    this.router.navigate(['/users']);
  }
}
