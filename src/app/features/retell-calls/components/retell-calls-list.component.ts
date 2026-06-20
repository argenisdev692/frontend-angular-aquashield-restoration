import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';

import { RetellCallsFeatureService } from '../services/retell-calls-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';
import { CallResponse, CallListResponse } from '../models/retell-calls.types';

@Component({
  selector: 'app-retell-calls-list',
  imports: [
    DatePipe,
    TableModule,
    PaginatorModule,
    AdvancedFilterComponent,
    PageHeaderComponent,
    SidebarComponent,
  ],
  templateUrl: './retell-calls-list.component.html',
  styleUrl: './retell-calls-list.component.css',
})
export class RetellCallsListComponent extends CrudListBase<CallResponse> {
  private api = inject(RetellCallsFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'call';
  }
  // Records originate from Retell — there is no "new" route; the create slot is
  // repurposed as a Sync action in the template.
  get newRoute(): string {
    return '/retell-calls';
  }
  get viewRoutePrefix(): string {
    return '/retell-calls';
  }
  get editRoutePrefix(): string {
    return '/retell-calls';
  }

  get filterFields(): FilterField[] {
    return [
      {
        key: 'userSentiment',
        label: 'Sentiment',
        type: 'select',
        options: [
          { label: 'Positive', value: 'Positive' },
          { label: 'Neutral', value: 'Neutral' },
          { label: 'Negative', value: 'Negative' },
          { label: 'Unknown', value: 'Unknown' },
        ],
        placeholder: 'All',
      },
      {
        key: 'callStatus',
        label: 'Call status',
        type: 'text',
        placeholder: 'Filter by call status',
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
          { label: 'All', value: 'all' },
        ],
        placeholder: 'All',
      },
    ];
  }

  get tableColumns() {
    return [
      { field: 'direction', header: 'Direction', sortable: false },
      { field: 'fromNumber', header: 'From', sortable: false },
      { field: 'toNumber', header: 'To', sortable: false },
      { field: 'callStatus', header: 'Call Status', sortable: false },
      { field: 'userSentiment', header: 'Sentiment', sortable: false },
      { field: 'durationMs', header: 'Duration', sortable: false },
      { field: 'startedAt', header: 'Started', sortable: true },
    ];
  }

  buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>
  ): Record<string, unknown> {
    const params: Record<string, unknown> = { page, limit };

    if (filters['search']) {
      params['search'] = filters['search'];
    }
    if (filters['callStatus']) {
      params['callStatus'] = filters['callStatus'];
    }
    if (filters['userSentiment']) {
      params['userSentiment'] = filters['userSentiment'];
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

  // Narrower than the base's `any` signature (allowed by method-parameter
  // bivariance) so the paginated envelope is read type-safely — no `any`.
  extractItems(response: CallListResponse | undefined): CallResponse[] {
    return response?.data ?? [];
  }

  extractTotal(response: CallListResponse | undefined): number {
    return response?.total ?? 0;
  }

  // ── Aliases for template compatibility ──
  readonly calls = this.items;
  readonly callsResource = this.dataResource;

  // ── Call-specific display helpers ──
  /** Human-readable direction ("inbound"/"outbound") or em dash. */
  direction(call: CallResponse): string {
    return call.direction ? this.titleCase(call.direction) : '—';
  }

  /** Format the duration (stored in ms) as "m:ss" or em dash. */
  duration(call: CallResponse): string {
    if (call.durationMs == null) return '—';
    const totalSeconds = Math.round(call.durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /** Token class for the sentiment chip. */
  sentimentClass(call: CallResponse): string {
    switch (call.userSentiment) {
      case 'Positive':
        return 'sentiment-chip sentiment-chip-positive';
      case 'Negative':
        return 'sentiment-chip sentiment-chip-negative';
      case 'Neutral':
        return 'sentiment-chip sentiment-chip-neutral';
      default:
        return 'sentiment-chip';
    }
  }

  private titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  // ── Sync (repurposed create slot) ──
  // Pull the latest records from Retell, then reload the table.
  onSync(): void {
    this.api
      .sync()
      .then(() => {
        this.notify.success('Calls synced', 'Latest call records pulled from Retell.');
        this.dataResource.reload();
      })
      .catch((error) => this.notify.error(error, 'Sync failed'));
  }

  // Mark an unread call as read from the list. Guarded in the template so it
  // only fires when the call is not already read (and not trashed).
  onMarkRead(id: string): void {
    this.api
      .markRead(id)
      .then(() => this.dataResource.reload())
      .catch((error) => this.notify.error(error, 'Could not mark as read'));
  }

  // The export endpoint serves PDF/XLSX/CSV from the same path — pass the
  // explicit format so each button downloads the right file type.
  override onExportPdf(): void {
    this.api
      .export({ ...this.buildExportParams(), format: 'pdf' })
      .then((blob) => this.downloadBlob(blob, 'retell-calls.pdf'))
      .catch((error) => this.notify.error(error, 'Export failed'));
  }

  override onExportExcel(): void {
    this.api
      .export({ ...this.buildExportParams(), format: 'xlsx' })
      .then((blob) => this.downloadBlob(blob, 'retell-calls.xlsx'))
      .catch((error) => this.notify.error(error, 'Export failed'));
  }

  override onExportCsv(): void {
    this.api
      .export({ ...this.buildExportParams(), format: 'csv' })
      .then((blob) => this.downloadBlob(blob, 'retell-calls.csv'))
      .catch((error) => this.notify.error(error, 'Export failed'));
  }
}
