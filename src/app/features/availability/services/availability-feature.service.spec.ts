import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { AvailabilityFeatureService } from './availability-feature.service';
import { ApiConfiguration } from '../../../api/api-configuration';
import {
  AvailabilityExceptionResponse,
  PaginatedExceptionResponse,
} from '../models/availability.types';

const ROOT = 'https://api.test';
const BASE = `${ROOT}/api/v1/availability`;

function exception(id: string, deleted = false): AvailabilityExceptionResponse {
  return {
    id,
    date: '2026-07-04',
    isAvailable: false,
    reason: 'Holiday',
    status: 'active',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    deletedAt: deleted ? '2026-06-10T00:00:00Z' : null,
  };
}

function page(rows: AvailabilityExceptionResponse[]): PaginatedExceptionResponse {
  return { data: rows, total: rows.length };
}

describe('AvailabilityFeatureService', () => {
  let service: AvailabilityFeatureService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const config = new ApiConfiguration();
    config.rootUrl = ROOT;

    TestBed.configureTestingModule({
      providers: [
        AvailabilityFeatureService,
        { provide: ApiConfiguration, useValue: config },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AvailabilityFeatureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('hits the active endpoint and forwards pagination/filter params', () => {
      service.getAll({ page: 2, limit: 25, isAvailable: 'false' });

      const req = httpMock.expectOne(
        (r) => r.url === `${BASE}/exceptions`
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('isAvailable')).toBe('false');
      req.flush(page([exception('1')]));
    });

    it('routes to the trash endpoint when status is "deleted" and strips status from params', () => {
      service.getAll({ page: 1, limit: 10, status: 'deleted' });

      const req = httpMock.expectOne((r) => r.url === `${BASE}/exceptions/trash`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('status')).toBe(false);
      req.flush(page([exception('9', true)]));
    });

    it('omits empty/null/undefined params', () => {
      service.getAll({ page: 1, limit: 10, reason: '', owner: undefined });

      const req = httpMock.expectOne((r) => r.url === `${BASE}/exceptions`);
      expect(req.request.params.has('reason')).toBe(false);
      expect(req.request.params.has('owner')).toBe(false);
      req.flush(page([]));
    });
  });

  describe('getById', () => {
    it('resolves from the active list first', async () => {
      const promise = service.getById('1');

      const active = httpMock.expectOne((r) => r.url === `${BASE}/exceptions`);
      active.flush(page([exception('1')]));

      await expect(promise).resolves.toMatchObject({ id: '1' });
    });

    it('falls back to the trash list when not active', async () => {
      const promise = service.getById('9');

      httpMock.expectOne((r) => r.url === `${BASE}/exceptions`).flush(page([]));
      // The trash request is only issued after the (awaited) active result is
      // consumed — yield to the microtask queue before expecting it.
      await Promise.resolve();
      await Promise.resolve();
      httpMock
        .expectOne((r) => r.url === `${BASE}/exceptions/trash`)
        .flush(page([exception('9', true)]));

      await expect(promise).resolves.toMatchObject({ id: '9', deletedAt: expect.any(String) });
    });
  });

  describe('write operations send the body (generated client drops it)', () => {
    it('create POSTs the DTO body', () => {
      service.create({ date: '2026-12-25', isAvailable: false, reason: 'Xmas' });

      const req = httpMock.expectOne(`${BASE}/exceptions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        date: '2026-12-25',
        isAvailable: false,
        reason: 'Xmas',
      });
      req.flush(exception('new'));
    });

    it('update PATCHes the DTO body to the id path', () => {
      service.update('42', { reason: 'Updated' });

      const req = httpMock.expectOne(`${BASE}/exceptions/42`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ reason: 'Updated' });
      req.flush(exception('42'));
    });

    it('upsertRule PUTs the rule body to the weekday path', () => {
      service.upsertRule(1, { isAvailable: true, startTime: '09:00', endTime: '17:00' });

      const req = httpMock.expectOne(`${BASE}/rules/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        isAvailable: true,
        startTime: '09:00',
        endTime: '17:00',
      });
      req.flush({});
    });
  });

  describe('export', () => {
    it('requests a blob with the requested format', () => {
      service.export({ format: 'xlsx', onlyTrashed: true });

      const req = httpMock.expectOne((r) => r.url === `${BASE}/exceptions/export`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.params.get('format')).toBe('xlsx');
      expect(req.request.params.get('onlyTrashed')).toBe('true');
      req.flush(new Blob(['x']));
    });

    it('defaults to csv when no format is given', () => {
      service.export();

      const req = httpMock.expectOne((r) => r.url === `${BASE}/exceptions/export`);
      expect(req.request.params.get('format')).toBe('csv');
      req.flush(new Blob(['x']));
    });
  });
});
