import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { RetellCallsService } from '../../../api/services/retell-calls.service';
import { ApiConfiguration } from '../../../api/api-configuration';
import { RetellCallsControllerFindAll$Params } from '../../../api/fn/retell-calls/retell-calls-controller-find-all';
import { BulkIdsPayload } from '../../../shared/crud-list-base';
import {
  CallResponse,
  CallListResponse,
  CallExportParams,
} from '../models/retell-calls.types';

/**
 * Feature wrapper over the generated `RetellCallsService`. Retell call records
 * are an external-source, read-only resource: no create/update — only sync,
 * list, view, soft-delete/restore (single + bulk), mark-read and export.
 */
@Service()
export class RetellCallsFeatureService {
  private api = inject(RetellCallsService);
  private apiConfig = inject(ApiConfiguration);
  private http = inject(HttpClient);

  // ── List / detail (CrudListBase reads `getAll`/`delete`/`restore`) ──
  getAll(params?: RetellCallsControllerFindAll$Params): Promise<CallListResponse> {
    return this.api.retellCallsControllerFindAll(params);
  }

  getById(id: string): Promise<CallResponse> {
    return this.api.retellCallsControllerFindOne({ id });
  }

  delete(id: string): Promise<void> {
    return this.api.retellCallsControllerDelete({ id });
  }

  restore(id: string): Promise<unknown> {
    return this.api.retellCallsControllerRestore({ id });
  }

  markRead(id: string): Promise<unknown> {
    return this.api.retellCallsControllerMarkRead({ id });
  }

  /** Pull the latest call records from Retell into the local store. */
  sync(): Promise<unknown> {
    return this.api.retellCallsControllerSync();
  }

  // ── Bulk soft-delete / restore (CrudListBase wires the checkbox UI) ──
  bulkDelete(dto: BulkIdsPayload): Promise<unknown> {
    return this.api.retellCallsControllerBulkDelete({ body: dto });
  }

  bulkRestore(dto: BulkIdsPayload): Promise<unknown> {
    return this.api.retellCallsControllerBulkRestore({ body: dto });
  }

  /**
   * Export the call records as a file. The generated client discards the body
   * (`responseType: 'text'` / `void`), so we GET the blob directly via
   * HttpClient — the auth interceptor adds the in-memory Bearer token.
   */
  export(params?: CallExportParams): Promise<Blob> {
    const { format = 'pdf', ...filters } = params ?? {};
    const url = `${this.apiConfig.rootUrl}/api/v1/retell/calls/export`;
    let httpParams = new HttpParams().set('format', format);
    if (filters.search) httpParams = httpParams.set('search', filters.search);
    if (filters.callStatus) httpParams = httpParams.set('callStatus', filters.callStatus);
    if (filters.userSentiment) httpParams = httpParams.set('userSentiment', filters.userSentiment);
    if (filters.status) httpParams = httpParams.set('status', filters.status);
    if (filters.onlyTrashed) httpParams = httpParams.set('onlyTrashed', 'true');
    if (filters.withTrashed) httpParams = httpParams.set('withTrashed', 'true');
    if (filters.start_date) httpParams = httpParams.set('start_date', filters.start_date);
    if (filters.end_date) httpParams = httpParams.set('end_date', filters.end_date);
    return firstValueFrom(
      this.http.get(url, { params: httpParams, responseType: 'blob' })
    );
  }
}
