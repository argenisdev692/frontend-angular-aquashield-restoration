import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AvailabilityExceptionsListComponent } from './availability-exceptions-list.component';
import { AvailabilityFeatureService } from '../services/availability-feature.service';
import { PaginatedExceptionResponse } from '../models/availability.types';

// Stub the feature service so the base resource loader never performs real HTTP.
const serviceStub: Partial<AvailabilityFeatureService> = {
  getAll: () => Promise.resolve({ data: [], total: 0 } as PaginatedExceptionResponse),
};

describe('AvailabilityExceptionsListComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AvailabilityFeatureService, useValue: serviceStub },
      ],
    });
  });

  // Exercise the class logic in an injection context without rendering the
  // template (the template pulls in the sidebar/ThemeService which touches
  // localStorage — unavailable in this unit-test environment).
  function create(): AvailabilityExceptionsListComponent {
    return TestBed.runInInjectionContext(() => new AvailabilityExceptionsListComponent());
  }

  it('creates and is read-only on bulk (no bulk endpoints exposed)', () => {
    const cmp = create();
    expect(cmp).toBeTruthy();
    expect(cmp.supportsBulk).toBe(false);
  });

  it('buildQueryParams always includes page and limit', () => {
    expect(create().buildQueryParams(3, 25, {})).toEqual({ page: 3, limit: 25 });
  });

  it('forwards the isAvailable filter', () => {
    const params = create().buildQueryParams(1, 10, { isAvailable: 'false' });
    expect(params['isAvailable']).toBe('false');
  });

  it('maps a date range to start_date/end_date (ISO date only)', () => {
    const params = create().buildQueryParams(1, 10, {
      dateRange: [new Date('2026-07-01T00:00:00Z'), new Date('2026-07-31T00:00:00Z')],
    });
    expect(params['start_date']).toBe('2026-07-01');
    expect(params['end_date']).toBe('2026-07-31');
  });

  it('passes status=deleted through so the service targets the trash endpoint', () => {
    const cmp = create();
    expect(cmp.buildQueryParams(1, 10, { status: 'deleted' })['status']).toBe('deleted');
    expect(cmp.buildQueryParams(1, 10, { status: 'active' })['status']).toBeUndefined();
  });

  it('extractItems / extractTotal read the paginated envelope', () => {
    const cmp = create();
    const response: PaginatedExceptionResponse = {
      data: [
        {
          id: '1',
          date: '2026-07-04',
          isAvailable: false,
          reason: 'Holiday',
          status: 'active',
          createdAt: '2026-06-01T00:00:00Z',
          updatedAt: '2026-06-01T00:00:00Z',
          deletedAt: null,
        },
      ],
      total: 1,
    };
    expect(cmp.extractItems(response).length).toBe(1);
    expect(cmp.extractTotal(response)).toBe(1);
    expect(cmp.extractItems(undefined)).toEqual([]);
    expect(cmp.extractTotal(undefined)).toBe(0);
  });
});
