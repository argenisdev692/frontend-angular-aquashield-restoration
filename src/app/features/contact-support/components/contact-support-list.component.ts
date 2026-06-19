import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

import { ContactSupportFeatureService } from '../services/contact-support-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';

@Component({
  selector: 'app-contact-support-list',
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
  templateUrl: './contact-support-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './contact-support-list.component.css',
})
export class ContactSupportListComponent extends CrudListBase<any> {
  private api = inject(ContactSupportFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'support request';
  }
  // Inbox-style resource — no admin create/edit. Routes resolve to the detail view.
  get newRoute(): string {
    return '/contact-support';
  }
  get viewRoutePrefix(): string {
    return '/contact-support';
  }
  get editRoutePrefix(): string {
    return '/contact-support';
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
        key: 'readed',
        label: 'Status',
        type: 'select',
        placeholder: 'All',
        options: [
          { label: 'Unread', value: 'false' },
          { label: 'Read', value: 'true' },
        ],
      },
      {
        key: 'status',
        label: 'Trash',
        type: 'trash',
        placeholder: 'All',
      },
    ];
  }

  get tableColumns() {
    return [
      { field: 'name', header: 'Name', sortable: false },
      { field: 'email', header: 'Email', sortable: false },
      { field: 'subject', header: 'Subject', sortable: false },
      { field: 'readed', header: 'Status', sortable: false },
      { field: 'createdAt', header: 'Received', sortable: true },
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

    const readed = filters['readed'] as string | undefined;
    if (readed === 'true' || readed === 'false') {
      params['readed'] = readed;
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
    return response?.data ?? [];
  }

  extractTotal(response: any): number {
    return response?.total ?? 0;
  }

  // ── Template aliases ──
  readonly requests = this.items;
  readonly requestsResource = this.dataResource;

  isDeleted(request: any): boolean {
    return this.isTrashed(request);
  }

  fullName(request: any): string {
    const name = `${request?.firstName ?? ''} ${request?.lastName ?? ''}`.trim();
    return name || '—';
  }

  onMarkAsRead(id: string): void {
    this.api.markAsRead(id).then(() => this.dataResource.reload());
  }

  // CSV export uses the dedicated text/csv endpoint (PDF/Excel buttons are disabled for this view).
  override onExportCsv(): void {
    this.api
      .exportCsv(this.buildExportParams())
      .then((blob) => this.downloadBlob(blob, `${this.entityName}.csv`));
  }
}
