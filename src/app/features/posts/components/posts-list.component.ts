import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

import { PostsFeatureService } from '../services/posts-feature.service';
import {
  AdvancedFilterComponent,
  FilterField,
} from '../../../components/advanced-filter/advanced-filter.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudListBase } from '../../../shared/crud-list-base';

@Component({
  selector: 'app-posts-list',
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
  templateUrl: './posts-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './posts-list.component.css',
})
export class PostsListComponent extends CrudListBase<any> {
  private api = inject(PostsFeatureService);

  override get service() {
    return this.api;
  }

  get entityName(): string {
    return 'post';
  }
  get newRoute(): string {
    return '/posts/generate';
  }
  get viewRoutePrefix(): string {
    return '/posts';
  }
  get editRoutePrefix(): string {
    return '/posts';
  }

  get filterFields(): FilterField[] {
    return [
      {
        key: 'postStatus',
        label: 'Status',
        type: 'select',
        placeholder: 'All statuses',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
          { label: 'Scheduled', value: 'scheduled' },
        ],
      },
      {
        key: 'dateRange',
        label: 'Date range',
        type: 'date-range',
        placeholder: 'Start — End',
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
      { field: 'postTitle', header: 'Title', sortable: true },
      { field: 'postStatus', header: 'Status', sortable: true },
      { field: 'categoryName', header: 'Category', sortable: false },
      { field: 'createdAt', header: 'Created', sortable: true },
    ];
  }

  buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = { page, limit };

    const search = filters['search'] as string | undefined;
    if (search) params['search'] = search;

    const postStatus = filters['postStatus'] as string | undefined;
    if (postStatus) params['postStatus'] = postStatus;

    const dateRange = filters['dateRange'] as Date[] | undefined;
    if (dateRange?.[0]) params['start_date'] = this.toIsoDate(dateRange[0]);
    if (dateRange?.[1]) params['end_date'] = this.toIsoDate(dateRange[1]);

    const status = filters['status'] as string | undefined;
    if (status === 'all') params['withTrashed'] = true;
    else if (status === 'deleted') params['onlyTrashed'] = true;

    return params;
  }

  extractItems(response: any): any[] {
    return response?.data ?? [];
  }

  extractTotal(response: any): number {
    return response?.total ?? 0;
  }

  // ── Template aliases ──
  readonly posts = this.items;
  readonly postsResource = this.dataResource;

  isDeleted(post: any): boolean {
    return this.isTrashed(post);
  }

  onGenerate(): void {
    this.router.navigate(['/posts/generate']);
  }
}
