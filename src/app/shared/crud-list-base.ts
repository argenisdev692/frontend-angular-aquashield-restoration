import { inject, signal, computed, resource, effect, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import {
  FilterField,
  FilterCriteria,
} from '../components/advanced-filter/advanced-filter.component';

export interface BulkIdsPayload {
  ids: string[];
}

export interface CrudListService<TEntity> {
  getAll(params?: unknown): Promise<unknown>;
  delete(id: string): Promise<unknown>;
  restore?(id: string): Promise<unknown>;
  bulkDelete?(dto: BulkIdsPayload): Promise<unknown>;
  bulkRestore?(dto: BulkIdsPayload): Promise<unknown>;
  export(params?: unknown): Promise<Blob>;
}

export abstract class CrudListBase<TEntity> {
  protected router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  abstract get service(): CrudListService<TEntity>;
  abstract get entityName(): string;
  abstract get newRoute(): string;
  abstract get viewRoutePrefix(): string;
  abstract get editRoutePrefix(): string;
  abstract get filterFields(): FilterField[];
  abstract get tableColumns(): Array<{
    field: string;
    header: string;
    sortable?: boolean;
  }>;

  abstract buildQueryParams(
    page: number,
    limit: number,
    filters: Record<string, unknown>
  ): Record<string, unknown>;
  abstract extractItems(response: any): TEntity[];
  abstract extractTotal(response: any): number;

  readonly drawerVisible = signal(false);
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly filterParams = signal<Record<string, unknown>>({});

  // ── Row selection (bulk operations) ──
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());

  readonly queryParams = computed(() =>
    this.buildQueryParams(this.page(), this.limit(), this.filterParams())
  );

  readonly dataResource = resource({
    loader: () => this.service.getAll(this.queryParams()),
  });

  // Guard against ResourceValueError when resource is in error state (SSR hydration)
  readonly items = computed(() => {
    if (this.dataResource.status() === 'error') return [];
    return this.extractItems(this.dataResource.value());
  });
  readonly total = computed(() => {
    if (this.dataResource.status() === 'error') return 0;
    return this.extractTotal(this.dataResource.value());
  });
  readonly isLoading = computed(() => this.dataResource.isLoading());
  readonly hasError = computed(() => this.dataResource.status() === 'error');
  readonly errorMessage = computed(() => {
    if (this.dataResource.status() !== 'error') return null;
    const err = this.dataResource.error() as any;
    if (err?.status === 401) return 'Session expired. Please log in again.';
    return 'Failed to load data. Please try again.';
  });

  // ── Bulk selection state ──
  get supportsBulkDelete(): boolean {
    return typeof this.service.bulkDelete === 'function';
  }
  get supportsBulkRestore(): boolean {
    return typeof this.service.bulkRestore === 'function';
  }
  /** Whether the selection (checkbox) column should be rendered. */
  get supportsBulk(): boolean {
    return this.supportsBulkDelete || this.supportsBulkRestore;
  }

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly hasSelection = computed(() => this.selectedIds().size > 0);

  /** Read entity ids without constraining TEntity (API rows always carry an `id`). */
  private rowIds(): string[] {
    return (this.items() as ReadonlyArray<{ id: string }>).map((item) => item.id);
  }

  readonly allSelected = computed(() => {
    const ids = this.rowIds();
    if (ids.length === 0) return false;
    const selected = this.selectedIds();
    return ids.every((id) => selected.has(id));
  });

  readonly someSelected = computed(() => {
    const ids = this.rowIds();
    const selected = this.selectedIds();
    const count = ids.filter((id) => selected.has(id)).length;
    return count > 0 && count < ids.length;
  });

  /** Currently selected rows resolved from the visible page (selection clears on page change). */
  private selectedRows(): ReadonlyArray<{ id: string }> {
    const selected = this.selectedIds();
    return (this.items() as ReadonlyArray<{ id: string }>).filter((row) =>
      selected.has(row.id)
    );
  }

  /** Active (non-trashed) ids within the current selection. */
  private selectedActiveIds(): string[] {
    return this.selectedRows()
      .filter((row) => !this.isTrashed(row))
      .map((row) => row.id);
  }

  /** Soft-deleted (trashed) ids within the current selection. */
  private selectedTrashedIds(): string[] {
    return this.selectedRows()
      .filter((row) => this.isTrashed(row))
      .map((row) => row.id);
  }

  /** True when the selection contains at least one active row (gates bulk delete). */
  readonly hasSelectedActive = computed(() => {
    const selected = this.selectedIds();
    return (this.items() as ReadonlyArray<{ id: string }>).some(
      (row) => selected.has(row.id) && !this.isTrashed(row)
    );
  });

  /** True when the selection contains at least one trashed row (gates bulk restore). */
  readonly hasSelectedTrashed = computed(() => {
    const selected = this.selectedIds();
    return (this.items() as ReadonlyArray<{ id: string }>).some(
      (row) => selected.has(row.id) && this.isTrashed(row)
    );
  });

  constructor() {
    // Auto-reload once in the browser if the resource failed during SSR hydration
    let hasAutoReloaded = false;
    effect(() => {
      if (
        isPlatformBrowser(this.platformId) &&
        this.dataResource.status() === 'error' &&
        !hasAutoReloaded
      ) {
        hasAutoReloaded = true;
        this.dataResource.reload();
      }
    });
  }

  onFiltersChange(criteria: FilterCriteria): void {
    this.filterParams.set({ ...criteria });
    this.page.set(1);
    this.clearSelection();
  }

  onPageChange(event: any): void {
    this.page.set((event.page ?? 0) + 1);
    this.limit.set(event.rows ?? 10);
    this.clearSelection();
  }

  // ── Selection helpers ──
  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: string): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    const ids = this.rowIds();
    this.selectedIds.update((current) => {
      const next = new Set(current);
      const everyOn = ids.length > 0 && ids.every((id) => next.has(id));
      if (everyOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // ── Bulk actions ──
  onBulkDelete(): void {
    // Only act on active rows — deleting already-trashed rows is a no-op.
    const ids = this.selectedActiveIds();
    if (ids.length === 0 || !this.service.bulkDelete) return;
    if (
      !confirm(
        `Are you sure you want to delete ${ids.length} selected ${this.entityName}(s)?`
      )
    )
      return;
    this.service.bulkDelete({ ids }).then(() => {
      this.clearSelection();
      this.dataResource.reload();
    });
  }

  onBulkRestore(): void {
    // Only act on trashed rows — restoring active rows is a no-op.
    const ids = this.selectedTrashedIds();
    if (ids.length === 0 || !this.service.bulkRestore) return;
    this.service.bulkRestore({ ids }).then(() => {
      this.clearSelection();
      this.dataResource.reload();
    });
  }

  onCreate(): void {
    this.router.navigate([this.newRoute]);
  }

  onView(id: string): void {
    this.router.navigate([this.viewRoutePrefix, id]);
  }

  onEdit(item: any): void {
    this.router.navigate([this.editRoutePrefix, item.id, 'edit']);
  }

  onDelete(id: string): void {
    if (!confirm(`Are you sure you want to delete this ${this.entityName}?`))
      return;
    this.service.delete(id).then(() => this.dataResource.reload());
  }

  onRestore(id: string): void {
    if (!this.service.restore) return;
    this.service.restore(id).then(() => this.dataResource.reload());
  }

  isTrashed(item: any): boolean {
    return item?.deletedAt !== null;
  }

  onExportPdf(): void {
    this.service
      .export(this.buildExportParams())
      .then((blob) => this.downloadBlob(blob, `${this.entityName}.pdf`));
  }

  onExportExcel(): void {
    this.service
      .export(this.buildExportParams())
      .then((blob) => this.downloadBlob(blob, `${this.entityName}.xlsx`));
  }

  protected buildExportParams(): {
    onlyTrashed?: boolean;
    withTrashed?: boolean;
  } {
    const filters = this.filterParams();
    const status = filters['status'] as string | undefined;
    if (status === 'active') return { withTrashed: false };
    if (status && status !== 'all') return { onlyTrashed: true };
    return {};
  }

  protected toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  protected downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
