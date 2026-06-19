import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

import { BlogCategoriesFeatureService } from '../services/blog-categories-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';

@Component({
  selector: 'app-blog-categories-list',
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
  templateUrl: './blog-categories-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './blog-categories-list.component.css',
})
export class BlogCategoriesListComponent extends CrudListBase<any> {
  private api = inject(BlogCategoriesFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'category';
  }
  get newRoute(): string {
    return '/blog-categories/new';
  }
  get viewRoutePrefix(): string {
    return '/blog-categories';
  }
  get editRoutePrefix(): string {
    return '/blog-categories';
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
      { field: 'createdAt', header: 'Created', sortable: true },
    ];
  }

  buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      skip: (page - 1) * limit,
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
    return response?.data ?? [];
  }

  extractTotal(response: any): number {
    return response?.total ?? 0;
  }

  // ── Aliases for template compatibility ──
  readonly categories = this.items;
  readonly categoriesResource = this.dataResource;

  isDeleted(category: any): boolean {
    return this.isTrashed(category);
  }
}
