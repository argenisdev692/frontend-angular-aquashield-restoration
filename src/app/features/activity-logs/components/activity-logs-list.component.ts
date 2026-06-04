import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

import { ActivityLogsFeatureService } from '../services/activity-logs-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';

@Component({
  selector: 'app-activity-logs-list',
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
  templateUrl: './activity-logs-list.component.html',
  styleUrl: './activity-logs-list.component.css',
})
export class ActivityLogsListComponent extends CrudListBase<any> {
  private api = inject(ActivityLogsFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'activity log';
  }
  get newRoute(): string {
    return '/activity-logs';
  }
  get viewRoutePrefix(): string {
    return '/activity-logs';
  }
  get editRoutePrefix(): string {
    return '/activity-logs';
  }

  get filterFields(): FilterField[] {
    return [
      {
        key: 'dateRange',
        label: 'Date range',
        type: 'date-range',
        placeholder: 'Start \u2014 End',
      },
      {
        key: 'action',
        label: 'Action',
        type: 'text',
        placeholder: 'Filter by action...',
      },
      {
        key: 'actorId',
        label: 'Actor ID',
        type: 'text',
        placeholder: 'Filter by actor...',
      },
      {
        key: 'resourceType',
        label: 'Resource Type',
        type: 'text',
        placeholder: 'Filter by resource type...',
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
      { field: 'action', header: 'Action', sortable: false },
      { field: 'actorId', header: 'Actor', sortable: false },
      { field: 'resourceType', header: 'Resource Type', sortable: false },
      { field: 'resourceId', header: 'Resource ID', sortable: false },
      { field: 'ipAddress', header: 'IP Address', sortable: false },
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

    if (filters['action']) {
      params['action'] = filters['action'];
    }
    if (filters['actorId']) {
      params['actorId'] = filters['actorId'];
    }
    if (filters['resourceType']) {
      params['resourceType'] = filters['resourceType'];
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

  readonly logs = this.items;
  readonly logsResource = this.dataResource;
}
