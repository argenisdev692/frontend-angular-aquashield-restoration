import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

import { RolesFeatureService } from '../services/roles-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';

@Component({
  selector: 'app-roles-list',
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
  templateUrl: './roles-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './roles-list.component.css',
})
export class RolesListComponent extends CrudListBase<any> {
  private api = inject(RolesFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'role';
  }
  get newRoute(): string {
    return '/roles/new';
  }
  get viewRoutePrefix(): string {
    return '/roles';
  }
  get editRoutePrefix(): string {
    return '/roles';
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
        type: 'trash',
        placeholder: 'All',
      },
    ];
  }

  get tableColumns() {
    return [
      { field: 'name', header: 'Name', sortable: true },
      { field: 'description', header: 'Description', sortable: false },
      { field: 'permissions', header: 'Permissions', sortable: false },
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
    } else if (status === 'deleted') {
      params['onlyTrashed'] = true;
    }

    return params;
  }

  extractItems(response: any): any[] {
    return Array.isArray(response) ? response : (response?.data ?? []);
  }

  extractTotal(response: any): number {
    return Array.isArray(response) ? response.length : (response?.total ?? 0);
  }

  // ── Aliases for template compatibility ──
  readonly roles = this.items;
  readonly rolesResource = this.dataResource;

  // ── Role-specific helpers ──
  isDeleted(role: any): boolean {
    return this.isTrashed(role);
  }

  isSystem(role: any): boolean {
    return role?.isSystem === true;
  }

  getPermissionNames(role: any): string {
    return role.permissions?.map((p: any) => p.name).join(', ') ?? '—';
  }

  getPermissionCount(role: any): number {
    return role.permissions?.length ?? 0;
  }
}
