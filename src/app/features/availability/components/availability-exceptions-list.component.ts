import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';

import { AvailabilityFeatureService } from '../services/availability-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';
import {
  AvailabilityExceptionResponse,
  PaginatedExceptionResponse,
} from '../models/availability.types';

@Component({
  selector: 'app-availability-exceptions-list',
  imports: [
    DatePipe,
    RouterLink,
    TableModule,
    PaginatorModule,
    AdvancedFilterComponent,
    PageHeaderComponent,
    SidebarComponent,
  ],
  templateUrl: './availability-exceptions-list.component.html',
  styleUrl: './availability-exceptions-list.component.css',
})
export class AvailabilityExceptionsListComponent extends CrudListBase<AvailabilityExceptionResponse> {
  private api = inject(AvailabilityFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'exception';
  }
  get newRoute(): string {
    return '/availability/exceptions/new';
  }
  get viewRoutePrefix(): string {
    return '/availability/exceptions';
  }
  get editRoutePrefix(): string {
    return '/availability/exceptions';
  }

  get filterFields(): FilterField[] {
    return [
      {
        key: 'isAvailable',
        label: 'Availability',
        type: 'select',
        options: [
          { label: 'Available', value: 'true' },
          { label: 'Closed', value: 'false' },
        ],
        placeholder: 'All',
      },
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
          { label: 'Deleted', value: 'deleted' },
        ],
        placeholder: 'Active',
      },
    ];
  }

  get tableColumns() {
    return [
      { field: 'date', header: 'Date', sortable: true },
      { field: 'isAvailable', header: 'Availability', sortable: false },
      { field: 'reason', header: 'Reason', sortable: false },
      { field: 'status', header: 'Status', sortable: false },
      { field: 'createdAt', header: 'Created', sortable: true },
    ];
  }

  buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>
  ): Record<string, unknown> {
    const params: Record<string, unknown> = { page, limit };

    if (filters['isAvailable'] !== undefined && filters['isAvailable'] !== null) {
      params['isAvailable'] = filters['isAvailable'];
    }

    const dateRange = filters['dateRange'] as Date[] | undefined;
    if (dateRange?.[0]) params['start_date'] = this.toIsoDate(dateRange[0]);
    if (dateRange?.[1]) params['end_date'] = this.toIsoDate(dateRange[1]);

    // `status: deleted` routes the request to the trash endpoint (see service).
    const status = filters['status'] as string | undefined;
    if (status === 'deleted') params['status'] = 'deleted';

    return params;
  }

  extractItems(response: PaginatedExceptionResponse | undefined): AvailabilityExceptionResponse[] {
    return response?.data ?? [];
  }

  extractTotal(response: PaginatedExceptionResponse | undefined): number {
    return response?.total ?? 0;
  }

  // ── Template aliases ──
  readonly exceptions = this.items;
  readonly exceptionsResource = this.dataResource;

  // ── Export (backend serves csv/xlsx only — no PDF) ──
  override onExportExcel(): void {
    this.api
      .export({ ...this.buildExportParams(), format: 'xlsx' })
      .then((blob) => this.downloadBlob(blob, 'availability-exceptions.xlsx'))
      .catch((error) => this.notify.error(error, 'Export failed'));
  }

  override onExportCsv(): void {
    this.api
      .export({ ...this.buildExportParams(), format: 'csv' })
      .then((blob) => this.downloadBlob(blob, 'availability-exceptions.csv'))
      .catch((error) => this.notify.error(error, 'Export failed'));
  }
}
