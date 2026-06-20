import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { RetellCallsFeatureService } from './retell-calls-feature.service';
import { ApiConfiguration } from '../../../api/api-configuration';
import { CallListResponse, CallResponse } from '../models/retell-calls.types';

const ROOT = 'https://api.test';
const BASE = `${ROOT}/api/v1/retell/calls`;

function call(id: string, deleted = false): CallResponse {
  return {
    id,
    callId: `call_${id}`,
    agentId: 'agent_1',
    callType: 'phone_call',
    direction: 'inbound',
    fromNumber: '+15550001111',
    toNumber: '+15550002222',
    callStatus: 'ended',
    disconnectionReason: 'user_hangup',
    startedAt: '2026-06-01T10:00:00Z',
    endedAt: '2026-06-01T10:03:20Z',
    durationMs: 200000,
    userSentiment: 'Positive',
    callSummary: 'Customer asked about pricing.',
    transcript: 'Agent: Hello…',
    recordingUrl: 'https://rec.test/1.wav',
    isRead: false,
    status: 'active',
    createdAt: '2026-06-01T10:03:30Z',
    updatedAt: '2026-06-01T10:03:30Z',
    deletedAt: deleted ? '2026-06-10T00:00:00Z' : null,
  };
}

function page(rows: CallResponse[]): CallListResponse {
  return {
    data: rows,
    limit: 10,
    page: 1,
    total: rows.length,
    totalPages: 1,
  };
}

describe('RetellCallsFeatureService', () => {
  let service: RetellCallsFeatureService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const config = new ApiConfiguration();
    config.rootUrl = ROOT;

    TestBed.configureTestingModule({
      providers: [
        RetellCallsFeatureService,
        { provide: ApiConfiguration, useValue: config },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(RetellCallsFeatureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('GETs the calls endpoint and forwards pagination/filter params', () => {
      service.getAll({
        page: 2,
        limit: 25,
        search: 'pricing',
        callStatus: 'ended',
        userSentiment: 'Positive',
        withTrashed: true,
      });

      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('search')).toBe('pricing');
      expect(req.request.params.get('callStatus')).toBe('ended');
      expect(req.request.params.get('userSentiment')).toBe('Positive');
      expect(req.request.params.get('withTrashed')).toBe('true');
      req.flush(page([call('1')]));
    });
  });

  describe('getById', () => {
    it('GETs the call by id path', async () => {
      const promise = service.getById('1');

      const req = httpMock.expectOne(`${BASE}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(call('1'));

      await expect(promise).resolves.toMatchObject({ id: '1' });
    });
  });

  describe('soft-delete lifecycle', () => {
    it('delete DELETEs the id path', () => {
      service.delete('1');
      const req = httpMock.expectOne(`${BASE}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('restore POSTs to the restore path', () => {
      service.restore('1');
      const req = httpMock.expectOne(`${BASE}/1/restore`);
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('markRead PATCHes the read path', () => {
      service.markRead('1');
      const req = httpMock.expectOne(`${BASE}/1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush({});
    });
  });

  describe('sync', () => {
    it('POSTs to the sync path', () => {
      service.sync();
      const req = httpMock.expectOne(`${BASE}/sync`);
      expect(req.request.method).toBe('POST');
      req.flush({ synced: 3 });
    });
  });

  describe('bulk operations send the ids body', () => {
    it('bulkDelete POSTs the ids to the bulk-delete path', () => {
      service.bulkDelete({ ids: ['1', '2'] });
      const req = httpMock.expectOne(`${BASE}/bulk-delete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids: ['1', '2'] });
      req.flush({});
    });

    it('bulkRestore POSTs the ids to the bulk-restore path', () => {
      service.bulkRestore({ ids: ['3'] });
      const req = httpMock.expectOne(`${BASE}/bulk-restore`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids: ['3'] });
      req.flush({});
    });
  });

  describe('export', () => {
    it('requests a blob with the requested format and filters', () => {
      service.export({ format: 'xlsx', userSentiment: 'Negative', onlyTrashed: true });

      const req = httpMock.expectOne((r) => r.url === `${BASE}/export`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.params.get('format')).toBe('xlsx');
      expect(req.request.params.get('userSentiment')).toBe('Negative');
      expect(req.request.params.get('onlyTrashed')).toBe('true');
      req.flush(new Blob(['x']));
    });

    it('defaults to pdf when no format is given', () => {
      service.export();

      const req = httpMock.expectOne((r) => r.url === `${BASE}/export`);
      expect(req.request.params.get('format')).toBe('pdf');
      req.flush(new Blob(['x']));
    });
  });
});
