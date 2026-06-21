import { TestBed } from '@angular/core/testing';

import { AppointmentsFeatureService } from './appointments-feature.service';
import { AppointmentsService } from '../../../api/services/appointments.service';
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
    email: 'jane@example.com',
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

function page(rows: AppointmentResponse[]): AppointmentListResponse {
  return { data: rows, limit: 10, page: 1, total: rows.length };
}

describe('AppointmentsFeatureService', () => {
  let service: AppointmentsFeatureService;
  let api: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    api = {
      appointmentsControllerFindAll: vi.fn(() => Promise.resolve(page([appointment()]))),
      appointmentsControllerFindOne: vi.fn(() => Promise.resolve(appointment())),
      appointmentsControllerCreate: vi.fn(() => Promise.resolve({ id: '99' })),
      appointmentsControllerUpdate: vi.fn(() => Promise.resolve(undefined)),
      appointmentsControllerDelete: vi.fn(() => Promise.resolve(undefined)),
      appointmentsControllerRestore: vi.fn(() => Promise.resolve({})),
      appointmentsControllerMarkRead: vi.fn(() => Promise.resolve({})),
      appointmentsControllerBulkDelete: vi.fn(() => Promise.resolve({})),
      appointmentsControllerBulkRestore: vi.fn(() => Promise.resolve({})),
      appointmentsControllerExport$Pdf: vi.fn(() => Promise.resolve(new Blob(['pdf']))),
      appointmentsControllerExport$VndOpenxmlformatsOfficedocumentSpreadsheetmlSheet: vi.fn(
        () => Promise.resolve(new Blob(['xlsx']))
      ),
      appointmentsControllerExport$Csv: vi.fn(() => Promise.resolve('name,phone\nJane,+1')),
    };

    TestBed.configureTestingModule({
      providers: [
        AppointmentsFeatureService,
        { provide: AppointmentsService, useValue: api },
      ],
    });

    service = TestBed.inject(AppointmentsFeatureService);
  });

  it('getAll forwards params to the generated client', async () => {
    await service.getAll({ page: 2, limit: 25, withTrashed: true });
    expect(api['appointmentsControllerFindAll']).toHaveBeenCalledWith({
      page: 2,
      limit: 25,
      withTrashed: true,
    });
  });

  it('getById delegates to findOne', async () => {
    await service.getById('1');
    expect(api['appointmentsControllerFindOne']).toHaveBeenCalledWith({ id: '1' });
  });

  it('create posts the dto then refetches the created entity by its new id', async () => {
    const created = await service.create({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+1',
      address: 'a',
      city: 'c',
      state: 's',
      country: 'co',
      zipcode: 'z',
    });
    expect(api['appointmentsControllerCreate']).toHaveBeenCalled();
    // create returns only { id }, so the service must refetch the full entity.
    expect(api['appointmentsControllerFindOne']).toHaveBeenCalledWith({ id: '99' });
    expect(created.id).toBe('1');
  });

  it('update patches then refetches by the same id', async () => {
    await service.update('5', { firstName: 'Jane', lastName: 'Doe', phone: '+1', address: 'a', city: 'c', state: 's', country: 'co', zipcode: 'z' });
    expect(api['appointmentsControllerUpdate']).toHaveBeenCalledWith({
      id: '5',
      body: expect.objectContaining({ firstName: 'Jane' }),
    });
    expect(api['appointmentsControllerFindOne']).toHaveBeenCalledWith({ id: '5' });
  });

  it('delete / restore / markRead delegate to their endpoints', async () => {
    await service.delete('1');
    await service.restore('1');
    await service.markRead('1');
    expect(api['appointmentsControllerDelete']).toHaveBeenCalledWith({ id: '1' });
    expect(api['appointmentsControllerRestore']).toHaveBeenCalledWith({ id: '1' });
    expect(api['appointmentsControllerMarkRead']).toHaveBeenCalledWith({ id: '1' });
  });

  it('bulkDelete / bulkRestore forward the ids body', async () => {
    await service.bulkDelete({ ids: ['1', '2'] });
    await service.bulkRestore({ ids: ['3'] });
    expect(api['appointmentsControllerBulkDelete']).toHaveBeenCalledWith({ body: { ids: ['1', '2'] } });
    expect(api['appointmentsControllerBulkRestore']).toHaveBeenCalledWith({ body: { ids: ['3'] } });
  });

  it('export defaults to pdf and resolves the raw blob', async () => {
    const blob = await service.export();
    expect(api['appointmentsControllerExport$Pdf']).toHaveBeenCalledWith({ format: 'pdf' });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('export xlsx forwards filters and resolves the raw blob', async () => {
    const blob = await service.export({ format: 'xlsx', onlyTrashed: true });
    expect(
      api['appointmentsControllerExport$VndOpenxmlformatsOfficedocumentSpreadsheetmlSheet']
    ).toHaveBeenCalledWith({ onlyTrashed: true, format: 'xlsx' });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('export csv wraps the text response in a text/csv Blob', async () => {
    const blob = await service.export({ format: 'csv' });
    expect(api['appointmentsControllerExport$Csv']).toHaveBeenCalledWith({ format: 'csv' });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/csv');
    expect(await blob.text()).toBe('name,phone\nJane,+1');
  });
});
