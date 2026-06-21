import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppointmentsListComponent } from './appointments-list.component';
import { AppointmentsFeatureService } from '../services/appointments-feature.service';
import { AppointmentResponse, AppointmentListResponse } from '../../../api/models';

function appointment(overrides: Partial<AppointmentResponse> = {}): AppointmentResponse {
  return {
    additionalNote: null,
    address: '123 Main St',
    address2: null,
    city: 'Houston',
    country: 'USA',
    createdAt: '2026-06-01T10:00:00Z',
    damageDetail: null,
    deletedAt: null,
    email: null,
    firstName: 'Jane',
    followUpCalls: null,
    followUpDate: null,
    id: '1',
    inspectionDate: null,
    inspectionStatus: 'Pending',
    inspectionTime: null,
    insuranceProperty: false,
    intentToClaim: null,
    isRead: false,
    lastName: 'Doe',
    latitude: null,
    leadSource: 'Website',
    longitude: null,
    message: null,
    notes: null,
    owner: null,
    phone: '+15550001111',
    registrationDate: null,
    smsConsent: false,
    state: 'TX',
    status: 'active',
    statusLead: 'New',
    updatedAt: '2026-06-01T10:00:00Z',
    zipcode: '77001',
    ...overrides,
  };
}

const empty: AppointmentListResponse = { data: [], limit: 10, page: 1, total: 0 };

// Stub the feature service so the base resource loader never performs real HTTP.
// bulkDelete/bulkRestore must exist for `supportsBulk` to be true.
const serviceStub: Partial<AppointmentsFeatureService> = {
  getAll: () => Promise.resolve(empty),
  markRead: () => Promise.resolve({}),
  bulkDelete: () => Promise.resolve({}),
  bulkRestore: () => Promise.resolve({}),
};

describe('AppointmentsListComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AppointmentsFeatureService, useValue: serviceStub },
      ],
    });
  });

  // Exercise the class logic in an injection context without rendering the
  // template (the template pulls in the sidebar/ThemeService which touches
  // localStorage — unavailable in this unit-test environment).
  function create(): AppointmentsListComponent {
    return TestBed.runInInjectionContext(() => new AppointmentsListComponent());
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

  it('forwards statusLead, city, state and owner filters', () => {
    const params = create().buildQueryParams(1, 10, {
      statusLead: 'New',
      city: 'Houston',
      state: 'TX',
      owner: 'Sam',
    });
    expect(params['statusLead']).toBe('New');
    expect(params['city']).toBe('Houston');
    expect(params['state']).toBe('TX');
    expect(params['owner']).toBe('Sam');
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
    const response: AppointmentListResponse = { ...empty, data: [appointment()], total: 1 };
    expect(cmp.extractItems(response).length).toBe(1);
    expect(cmp.extractTotal(response)).toBe(1);
    expect(cmp.extractItems(undefined)).toEqual([]);
    expect(cmp.extractTotal(undefined)).toBe(0);
  });

  it('builds the full name and location from the row', () => {
    const cmp = create();
    expect(cmp.fullName(appointment())).toBe('Jane Doe');
    expect(cmp.location(appointment())).toBe('Houston, TX');
    expect(cmp.location(appointment({ city: '', state: '' }))).toBe('—');
  });

  it('maps lead status to a token chip class', () => {
    const cmp = create();
    expect(cmp.leadStatusClass(appointment({ statusLead: 'New' }))).toContain('lead-chip-new');
    expect(cmp.leadStatusClass(appointment({ statusLead: 'Called' }))).toContain('lead-chip-called');
    expect(cmp.leadStatusClass(appointment({ statusLead: 'Pending' }))).toContain('lead-chip-pending');
    expect(cmp.leadStatusClass(appointment({ statusLead: 'Declined' }))).toContain('lead-chip-declined');
    expect(cmp.leadStatusClass(appointment({ statusLead: null }))).toBe('lead-chip');
  });

  it('isTrashed reflects the deletedAt timestamp', () => {
    const cmp = create();
    expect(cmp.isTrashed(appointment({ deletedAt: null }))).toBe(false);
    expect(cmp.isTrashed(appointment({ deletedAt: '2026-06-10T00:00:00Z' }))).toBe(true);
  });

  it('onMarkRead calls the service for the given id', () => {
    const markRead = vi.spyOn(serviceStub, 'markRead');
    create().onMarkRead('1');
    expect(markRead).toHaveBeenCalledWith('1');
  });
});
