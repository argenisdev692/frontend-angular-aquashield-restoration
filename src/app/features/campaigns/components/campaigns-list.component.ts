import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

import { CampaignsFeatureService } from '../services/campaigns-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';
import { CampaignExportListItemResponse } from '../models/campaigns.types';

@Component({
  selector: 'app-campaigns-list',
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
  templateUrl: './campaigns-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './campaigns-list.component.css',
})
export class CampaignsListComponent extends CrudListBase<CampaignExportListItemResponse> {
  private api = inject(CampaignsFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'campaign';
  }
  get newRoute(): string {
    return '/campaigns/generate';
  }
  get viewRoutePrefix(): string {
    return '/campaigns';
  }
  get editRoutePrefix(): string {
    return '/campaigns';
  }

  get filterFields(): FilterField[] {
    return [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        placeholder: 'All statuses',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Processing', value: 'processing' },
          { label: 'Completed', value: 'completed' },
          { label: 'Partial', value: 'partial' },
          { label: 'Failed', value: 'failed' },
        ],
      },
      {
        key: 'dateRange',
        label: 'Date range',
        type: 'date-range',
        placeholder: 'Start — End',
      },
    ];
  }

  get tableColumns() {
    return [
      { field: 'companyName', header: 'Company', sortable: true },
      { field: 'niche', header: 'Niche', sortable: false },
      { field: 'status', header: 'Status', sortable: true },
      { field: 'stages', header: 'Stages', sortable: false },
      { field: 'createdAt', header: 'Created', sortable: true },
    ];
  }

  buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>,
  ): Record<string, unknown> {
    // listCampaigns is offset-based (not page-based) and returns a plain array.
    const params: Record<string, unknown> = { limit, offset: (page - 1) * limit };

    const status = filters['status'] as string | undefined;
    if (status) params['status'] = status;

    const dateRange = filters['dateRange'] as Date[] | undefined;
    if (dateRange?.[0]) params['start_date'] = this.toIsoDate(dateRange[0]);
    if (dateRange?.[1]) params['end_date'] = this.toIsoDate(dateRange[1]);

    return params;
  }

  extractItems(response: unknown): CampaignExportListItemResponse[] {
    return Array.isArray(response) ? response : [];
  }

  extractTotal(response: unknown): number {
    // The endpoint returns a plain array with no total count; use the page size
    // as a best-effort total so the paginator can advance while results fill.
    return Array.isArray(response) ? response.length : 0;
  }

  // Campaign generations are hard-deleted and the list response carries no
  // `deletedAt`, so every row is "active" — overriding keeps bulk delete + the
  // context-aware bar working (the base's default treats undefined as trashed).
  override isTrashed(): boolean {
    return false;
  }

  // ── Template aliases ──
  readonly campaigns = this.items;
  readonly campaignsResource = this.dataResource;

  onGenerate(): void {
    this.router.navigate(['/campaigns/generate']);
  }

  stagesLabel(row: CampaignExportListItemResponse): string {
    return `${row.stagesCompleted}/${row.stagesRequested}`;
  }
}
