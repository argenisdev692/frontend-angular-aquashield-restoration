import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AvailabilityAdminService } from '../../../api/services/availability-admin.service';
import { ApiConfiguration } from '../../../api/api-configuration';
import {
  AvailabilityExceptionResponse,
  AvailabilityRuleResponse,
  PaginatedExceptionResponse,
  CreateExceptionDto,
  UpdateExceptionDto,
  UpsertRuleDto,
} from '../models/availability.types';

export type AvailabilityExportFormat = 'csv' | 'xlsx';

export interface AvailabilityExportParams {
  onlyTrashed?: boolean;
  withTrashed?: boolean;
  format?: AvailabilityExportFormat;
}

/**
 * Feature service for the Availability module.
 *
 * The generated client (`AvailabilityAdminService`) is fine for path/query-only
 * operations (delete, restore), but it discards the JSON request bodies for
 * create/update/upsert and ignores list pagination/filter params. For those we
 * call the backend through raw `HttpClient` against `ApiConfiguration.rootUrl`
 * — the functional auth interceptor attaches the in-memory Bearer token.
 */
@Service()
export class AvailabilityFeatureService {
  private api = inject(AvailabilityAdminService);
  private apiConfig = inject(ApiConfiguration);
  private http = inject(HttpClient);

  private get base(): string {
    return `${this.apiConfig.rootUrl}/api/v1/availability`;
  }

  // ── Exceptions: list (CrudListBase reads `getAll`) ──
  /**
   * The backend exposes active exceptions at `/exceptions` and soft-deleted
   * ones at `/exceptions/trash` (there is no combined "with trashed" flag), so
   * the `status` filter selects the endpoint.
   */
  getAll(params?: Record<string, unknown>): Promise<PaginatedExceptionResponse> {
    const { status, ...rest } = params ?? {};
    const url = status === 'deleted' ? `${this.base}/exceptions/trash` : `${this.base}/exceptions`;
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return firstValueFrom(
      this.http.get<PaginatedExceptionResponse>(url, { params: httpParams })
    );
  }

  // ── Exceptions: single (no findOne endpoint — resolve from the lists) ──
  async getById(id: string): Promise<AvailabilityExceptionResponse> {
    const active = await this.getAll({ limit: 1000 });
    const found = active.data.find((row) => row.id === id);
    if (found) return found as AvailabilityExceptionResponse;
    const trashed = await this.getAll({ status: 'deleted', limit: 1000 });
    const trashedRow = trashed.data.find((row) => row.id === id);
    if (trashedRow) return trashedRow as AvailabilityExceptionResponse;
    throw new Error(`Availability exception ${id} not found`);
  }

  // ── Exceptions: write (raw HttpClient — generated client drops the body) ──
  create(dto: CreateExceptionDto): Promise<AvailabilityExceptionResponse> {
    return firstValueFrom(
      this.http.post<AvailabilityExceptionResponse>(`${this.base}/exceptions`, dto)
    );
  }

  update(id: string, dto: UpdateExceptionDto): Promise<AvailabilityExceptionResponse> {
    return firstValueFrom(
      this.http.patch<AvailabilityExceptionResponse>(`${this.base}/exceptions/${id}`, dto)
    );
  }

  delete(id: string): Promise<void> {
    return this.api.availabilityControllerDeleteException({ id });
  }

  restore(id: string): Promise<unknown> {
    return this.api.availabilityControllerRestoreException({ id });
  }

  // ── Export (csv | xlsx only) ──
  export(params?: AvailabilityExportParams): Promise<Blob> {
    const format: AvailabilityExportFormat = params?.format ?? 'csv';
    let httpParams = new HttpParams().set('format', format);
    if (params?.onlyTrashed) httpParams = httpParams.set('onlyTrashed', 'true');
    if (params?.withTrashed) httpParams = httpParams.set('withTrashed', 'true');
    return firstValueFrom(
      this.http.get(`${this.base}/exceptions/export`, {
        params: httpParams,
        responseType: 'blob',
      })
    );
  }

  // ── Weekly rules ──
  getRules(): Promise<Array<AvailabilityRuleResponse>> {
    return this.api.availabilityControllerGetRules();
  }

  /** Create or update the rule for a weekday (0=Sun … 6=Sat). Body is sent raw. */
  upsertRule(dayOfWeek: number, dto: UpsertRuleDto): Promise<AvailabilityRuleResponse> {
    return firstValueFrom(
      this.http.put<AvailabilityRuleResponse>(`${this.base}/rules/${dayOfWeek}`, dto)
    );
  }
}
