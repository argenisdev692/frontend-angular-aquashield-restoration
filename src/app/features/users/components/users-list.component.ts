import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

import { UsersFeatureService } from '../services/users-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TableModule,
    ButtonModule,
    PaginatorModule,
    AdvancedFilterComponent,
    PageHeaderComponent,
    SidebarComponent,
  ],
  templateUrl: './users-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './users-list.component.css',
})
export class UsersListComponent extends CrudListBase<any> {
  private api = inject(UsersFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'user';
  }
  get newRoute(): string {
    return '/users/new';
  }
  get viewRoutePrefix(): string {
    return '/users';
  }
  get editRoutePrefix(): string {
    return '/users';
  }

  get filterFields(): FilterField[] {
    return [
      {
        key: 'dateRange',
        label: 'Date range',
        type: 'date-range',
        placeholder: 'Start — End',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Suspended', value: 'suspended' },
          { label: 'All', value: 'all' },
        ],
        placeholder: 'All',
      },
    ];
  }

  get tableColumns() {
    return [
      { field: 'name', header: 'Name', sortable: true },
      { field: 'email', header: 'Email', sortable: true },
      { field: 'phone', header: 'Phone', sortable: false },
      { field: 'roles', header: 'Roles', sortable: false },
      { field: 'createdAt', header: 'Created', sortable: true },
    ];
  }

  buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      page,
      limit,
    };

    if (filters['search']) {
      params['search'] = filters['search'];
    }

    const dateRange = filters['dateRange'] as Date[] | undefined;
    if (dateRange?.[0]) {
      params['start_date'] = this.toIsoDate(dateRange[0]);
    }
    if (dateRange?.[1]) {
      params['end_date'] = this.toIsoDate(dateRange[1]);
    }

    const status = filters['status'] as string | undefined;
    if (status === 'all') {
      params['withTrashed'] = true;
    } else if (status === 'suspended') {
      params['onlyTrashed'] = true;
    }

    return params;
  }

  extractItems(response: any): any[] {
    return response?.data ?? [];
  }

  extractTotal(response: any): number {
    return response?.total ?? 0;
  }

  // ── Aliases for template compatibility ──
  readonly users = this.items;
  readonly usersResource = this.dataResource;

  // ── User-specific helpers ──
  getRoleNames(user: any): string {
    return user.roles?.map((r: any) => r.name).join(', ') ?? '—';
  }

  isSuspended(user: any): boolean {
    return this.isTrashed(user);
  }

  onManagePermissions(id: string): void {
    this.router.navigate(['/users', id, 'permissions']);
  }
}
