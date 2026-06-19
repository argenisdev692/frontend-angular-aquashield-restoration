import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

import { BackupsFeatureService } from '../services/backups-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';

@Component({
  selector: 'app-backups-list',
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
  templateUrl: './backups-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './backups-list.component.css',
})
export class BackupsListComponent extends CrudListBase<any> {
  private api = inject(BackupsFeatureService);

  readonly triggering = signal(false);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'backup';
  }
  get newRoute(): string {
    return '/backups';
  }
  get viewRoutePrefix(): string {
    return '/backups';
  }
  get editRoutePrefix(): string {
    return '/backups';
  }

  get filterFields(): FilterField[] {
    return [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        placeholder: 'All statuses',
        options: [
          { label: 'Pending', value: 'PENDING' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Failed', value: 'FAILED' },
        ],
      },
      {
        key: 'triggeredBy',
        label: 'Triggered By',
        type: 'select',
        placeholder: 'Any source',
        options: [
          { label: 'Scheduler', value: 'SCHEDULER' },
          { label: 'Manual', value: 'MANUAL' },
        ],
      },
      {
        key: 'dateRange',
        label: 'Date range',
        type: 'date-range',
        placeholder: 'Start \u2014 End',
      },
    ];
  }

  get tableColumns() {
    return [
      { field: 'status', header: 'Status', sortable: false },
      { field: 'triggeredBy', header: 'Source', sortable: false },
      { field: 'sizeBytes', header: 'Size', sortable: false },
      { field: 'startedAt', header: 'Started', sortable: true },
      { field: 'completedAt', header: 'Completed', sortable: false },
      { field: 'createdAt', header: 'Created', sortable: true },
    ];
  }

  buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = { page, limit };

    if (filters['status']) {
      params['status'] = filters['status'];
    }
    if (filters['triggeredBy']) {
      params['triggeredBy'] = filters['triggeredBy'];
    }

    const dateRange = filters['dateRange'] as Date[] | undefined;
    if (dateRange?.[0]) {
      params['start_date'] = this.toIsoDate(dateRange[0]);
    }
    if (dateRange?.[1]) {
      params['end_date'] = this.toIsoDate(dateRange[1]);
    }

    return params;
  }

  extractItems(response: any): any[] {
    return response?.data ?? [];
  }

  extractTotal(response: any): number {
    return response?.total ?? 0;
  }

  readonly backups = this.items;
  readonly backupsResource = this.dataResource;

  onRunBackup(): void {
    if (this.triggering()) return;
    this.triggering.set(true);
    this.api
      .trigger()
      .then(() => this.dataResource.reload())
      .finally(() => this.triggering.set(false));
  }

  onDownload(backup: any): void {
    if (backup?.status !== 'COMPLETED') return;
    this.api.download(backup.id).then((blob) => {
      const filename = backup.objectKey
        ? backup.objectKey.split('/').pop()
        : `backup-${backup.id}.dump`;
      this.downloadBlob(blob, filename);
    });
  }

  override onExportPdf(): void {
    this.api.exportPdf().then((blob) => this.downloadBlob(blob, 'backups.pdf'));
  }

  formatSize(bytes: number | null): string {
    if (bytes === null || bytes === undefined) return '\u2014';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
