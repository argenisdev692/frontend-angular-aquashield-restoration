import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';

import { AppointmentsFeatureService } from '../services/appointments-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';
import { AppointmentResponse, AppointmentListResponse } from '../../../api/models';

@Component({
  selector: 'app-appointments-list',
  imports: [
    DatePipe,
    TableModule,
    PaginatorModule,
    AdvancedFilterComponent,
    PageHeaderComponent,
    SidebarComponent,
  ],
  templateUrl: './appointments-list.component.html',
  styleUrl: './appointments-list.component.css',
})
export class AppointmentsListComponent extends CrudListBase<AppointmentResponse> {
  private api = inject(AppointmentsFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'appointment';
  }
  get newRoute(): string {
    return '/appointments/new';
  }
  get viewRoutePrefix(): string {
    return '/appointments';
  }
  get editRoutePrefix(): string {
    return '/appointments';
  }

  get filterFields(): FilterField[] {
    return [
      {
        key: 'statusLead',
        label: 'Lead status',
        type: 'select',
        options: [
          { label: 'New', value: 'New' },
          { label: 'Called', value: 'Called' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Declined', value: 'Declined' },
        ],
        placeholder: 'All',
      },
      { key: 'city', label: 'City', type: 'text', placeholder: 'Filter by city' },
      { key: 'state', label: 'State', type: 'text', placeholder: 'Filter by state' },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Filter by owner' },
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
          { label: 'All', value: 'all' },
        ],
        placeholder: 'All',
      },
    ];
  }

  get tableColumns() {
    return [
      { field: 'name', header: 'Name', sortable: true },
      { field: 'phone', header: 'Phone', sortable: false },
      { field: 'location', header: 'Location', sortable: false },
      { field: 'statusLead', header: 'Lead Status', sortable: false },
      { field: 'owner', header: 'Owner', sortable: false },
      { field: 'createdAt', header: 'Created', sortable: true },
    ];
  }

  buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      page,
      limit,
    };

    for (const key of ['statusLead', 'city', 'state', 'owner'] as const) {
      if (filters[key]) {
        params[key] = filters[key];
      }
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
    } else if (status === 'deleted') {
      params['onlyTrashed'] = true;
    }

    return params;
  }

  extractItems(response: AppointmentListResponse | undefined): AppointmentResponse[] {
    return response?.data ?? [];
  }

  extractTotal(response: AppointmentListResponse | undefined): number {
    return response?.total ?? 0;
  }

  // ── Aliases for template compatibility ──
  readonly appointments = this.items;
  readonly appointmentsResource = this.dataResource;

  // ── Appointment-specific helpers ──
  fullName(appointment: AppointmentResponse): string {
    return `${appointment.firstName} ${appointment.lastName}`.trim();
  }

  location(appointment: AppointmentResponse): string {
    return [appointment.city, appointment.state].filter(Boolean).join(', ') || '—';
  }

  // Mark an unread lead as read from the list. Guarded in the template so it
  // only fires when the appointment is not already read (and not trashed).
  // Optimistic: flip `isRead` locally for instant feedback (zoneless/signal),
  // then revert and surface a toast if the request fails — no full refetch.
  onMarkRead(id: string): void {
    const snapshot = this.dataResource.value();
    this.dataResource.value.update((resp) => {
      const list = resp as AppointmentListResponse | undefined;
      if (!list?.data) return resp;
      return {
        ...list,
        data: list.data.map((row) => (row.id === id ? { ...row, isRead: true } : row)),
      };
    });
    this.api.markRead(id).catch((error) => {
      this.dataResource.value.set(snapshot);
      this.notify.error(error, 'Failed to mark as read');
    });
  }

  leadStatusClass(appointment: AppointmentResponse): string {
    switch (appointment.statusLead) {
      case 'New':
        return 'lead-chip lead-chip-new';
      case 'Called':
        return 'lead-chip lead-chip-called';
      case 'Pending':
        return 'lead-chip lead-chip-pending';
      case 'Declined':
        return 'lead-chip lead-chip-declined';
      default:
        return 'lead-chip';
    }
  }

  // The export endpoint serves PDF/XLSX/CSV from the same path — pass the
  // explicit format so each button downloads the right file type.
  override onExportPdf(): void {
    this.api
      .export({ ...this.buildExportParams(), format: 'pdf' })
      .then((blob) => this.downloadBlob(blob, 'appointments.pdf'))
      .catch((error) => this.notify.error(error, 'Export failed'));
  }

  override onExportExcel(): void {
    this.api
      .export({ ...this.buildExportParams(), format: 'xlsx' })
      .then((blob) => this.downloadBlob(blob, 'appointments.xlsx'))
      .catch((error) => this.notify.error(error, 'Export failed'));
  }

  override onExportCsv(): void {
    this.api
      .export({ ...this.buildExportParams(), format: 'csv' })
      .then((blob) => this.downloadBlob(blob, 'appointments.csv'))
      .catch((error) => this.notify.error(error, 'Export failed'));
  }
}
