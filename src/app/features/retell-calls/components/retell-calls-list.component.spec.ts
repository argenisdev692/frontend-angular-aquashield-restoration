import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RetellCallsListComponent } from './retell-calls-list.component';
import { RetellCallsFeatureService } from '../services/retell-calls-feature.service';
import { CallListResponse, CallResponse } from '../models/retell-calls.types';

function call(overrides: Partial<CallResponse> = {}): CallResponse {
  return {
    id: '1',
    callId: 'call_1',
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
    callSummary: null,
    transcript: null,
    recordingUrl: null,
    isRead: false,
    status: 'active',
    createdAt: '2026-06-01T10:03:30Z',
    updatedAt: '2026-06-01T10:03:30Z',
    deletedAt: null,
    ...overrides,
  };
}

const empty: CallListResponse = { data: [], limit: 10, page: 1, total: 0, totalPages: 0 };

// Stub the feature service so the base resource loader never performs real HTTP.
// bulkDelete/bulkRestore must exist for `supportsBulk` to be true.
const serviceStub: Partial<RetellCallsFeatureService> = {
  getAll: () => Promise.resolve(empty),
  bulkDelete: () => Promise.resolve({}),
  bulkRestore: () => Promise.resolve({}),
};

describe('RetellCallsListComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RetellCallsFeatureService, useValue: serviceStub },
      ],
    });
  });

  // Exercise the class logic in an injection context without rendering the
  // template (the template pulls in the sidebar/ThemeService which touches
  // localStorage — unavailable in this unit-test environment).
  function create(): RetellCallsListComponent {
    return TestBed.runInInjectionContext(() => new RetellCallsListComponent());
  }

  it('creates and supports bulk (delete + restore endpoints exposed)', () => {
    const cmp = create();
    expect(cmp).toBeTruthy();
    expect(cmp.supportsBulk).toBe(true);
    expect(cmp.supportsBulkDelete).toBe(true);
    expect(cmp.supportsBulkRestore).toBe(true);
  });

  it('buildQueryParams always includes page and limit', () => {
    expect(create().buildQueryParams(3, 25, {})).toEqual({ page: 3, limit: 25 });
  });

  it('forwards search, callStatus and userSentiment filters', () => {
    const params = create().buildQueryParams(1, 10, {
      search: 'pricing',
      callStatus: 'ended',
      userSentiment: 'Positive',
    });
    expect(params['search']).toBe('pricing');
    expect(params['callStatus']).toBe('ended');
    expect(params['userSentiment']).toBe('Positive');
  });

  it('maps a date range to start_date/end_date (ISO date only)', () => {
    const params = create().buildQueryParams(1, 10, {
      dateRange: [new Date('2026-06-01T00:00:00Z'), new Date('2026-06-30T00:00:00Z')],
    });
    expect(params['start_date']).toBe('2026-06-01');
    expect(params['end_date']).toBe('2026-06-30');
  });

  it('translates the status filter into withTrashed/onlyTrashed', () => {
    const cmp = create();
    expect(cmp.buildQueryParams(1, 10, { status: 'all' })['withTrashed']).toBe(true);
    expect(cmp.buildQueryParams(1, 10, { status: 'deleted' })['onlyTrashed']).toBe(true);
    const active = cmp.buildQueryParams(1, 10, { status: 'active' });
    expect(active['withTrashed']).toBeUndefined();
    expect(active['onlyTrashed']).toBeUndefined();
  });

  it('extractItems / extractTotal read the paginated envelope', () => {
    const cmp = create();
    const response: CallListResponse = { ...empty, data: [call()], total: 1 };
    expect(cmp.extractItems(response).length).toBe(1);
    expect(cmp.extractTotal(response)).toBe(1);
    expect(cmp.extractItems(undefined)).toEqual([]);
    expect(cmp.extractTotal(undefined)).toBe(0);
  });

  it('formats duration (ms) as m:ss and falls back to em dash', () => {
    const cmp = create();
    expect(cmp.duration(call({ durationMs: 200000 }))).toBe('3:20');
    expect(cmp.duration(call({ durationMs: 5000 }))).toBe('0:05');
    expect(cmp.duration(call({ durationMs: null }))).toBe('—');
  });

  it('title-cases the direction and falls back to em dash', () => {
    const cmp = create();
    expect(cmp.direction(call({ direction: 'inbound' }))).toBe('Inbound');
    expect(cmp.direction(call({ direction: null }))).toBe('—');
  });

  it('maps sentiment to a token chip class', () => {
    const cmp = create();
    expect(cmp.sentimentClass(call({ userSentiment: 'Positive' }))).toContain('sentiment-chip-positive');
    expect(cmp.sentimentClass(call({ userSentiment: 'Negative' }))).toContain('sentiment-chip-negative');
    expect(cmp.sentimentClass(call({ userSentiment: 'Neutral' }))).toContain('sentiment-chip-neutral');
    expect(cmp.sentimentClass(call({ userSentiment: null }))).toBe('sentiment-chip');
  });

  it('isTrashed reflects the deletedAt timestamp', () => {
    const cmp = create();
    expect(cmp.isTrashed(call({ deletedAt: null }))).toBe(false);
    expect(cmp.isTrashed(call({ deletedAt: '2026-06-10T00:00:00Z' }))).toBe(true);
  });
});
