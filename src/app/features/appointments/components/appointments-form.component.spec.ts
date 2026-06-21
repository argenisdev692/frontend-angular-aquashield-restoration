import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';

import { AppointmentsFormComponent } from './appointments-form.component';
import { AppointmentsFeatureService } from '../services/appointments-feature.service';
import { AvailabilityFeatureService } from '../../availability/services/availability-feature.service';

const apptStub: Partial<AppointmentsFeatureService> = {
  getById: () => Promise.reject(new Error('not used')),
};

// Availability is queried by the booking calendar/slot resources — return empties.
const availabilityStub: Partial<AvailabilityFeatureService> = {
  getCalendar: () => Promise.resolve([]),
  getTimeSlots: () => Promise.resolve([]),
};

describe('AppointmentsFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: AppointmentsFeatureService, useValue: apptStub },
        { provide: AvailabilityFeatureService, useValue: availabilityStub },
      ],
    });
  });

  // Exercise class logic without rendering the template (it pulls in the
  // sidebar/ThemeService + PrimeNG datepicker, unneeded for unit logic).
  function create(): AppointmentsFormComponent {
    return TestBed.runInInjectionContext(() => new AppointmentsFormComponent());
  }

  it('creates in "new" mode with an initially invalid (required) form', () => {
    const cmp = create();
    expect(cmp).toBeTruthy();
    expect(cmp.isEdit()).toBe(false);
    expect(cmp.form.invalid).toBe(true);
  });

  it('requires an inspection time once an inspection date is chosen', () => {
    const cmp = create();
    cmp.form.get('inspectionDate')?.setValue('2026-07-01T00:00:00Z');
    cmp.form.get('inspectionTime')?.setValue('');
    expect(cmp.form.errors?.['inspectionTimeRequired']).toBe(true);

    cmp.form.get('inspectionTime')?.setValue('2026-07-01T13:00:00Z');
    expect(cmp.form.errors?.['inspectionTimeRequired']).toBeFalsy();
  });

  it('onDateSelected stores the day and clears any previously chosen slot', () => {
    const cmp = create();
    cmp.onSlotSelected({ time: '2026-07-01T13:00:00Z', formattedTime: '08:00' });

    const day = new Date('2026-07-01T12:00:00Z');
    cmp.onDateSelected(day);

    expect(cmp.selectedDate()).toBe(day);
    expect(cmp.form.get('inspectionDate')?.value).toBe(day.toISOString());
    expect(cmp.selectedSlotIso()).toBeNull();
    expect(cmp.form.get('inspectionTime')?.value).toBe('');
  });

  it('onSlotSelected persists the ISO start into the form', () => {
    const cmp = create();
    cmp.onSlotSelected({ time: '2026-07-01T13:00:00Z', formattedTime: '08:00' });
    expect(cmp.selectedSlotIso()).toBe('2026-07-01T13:00:00Z');
    expect(cmp.form.get('inspectionTime')?.value).toBe('2026-07-01T13:00:00Z');
  });

  it('clearInspection resets the booking state and controls', () => {
    const cmp = create();
    cmp.onDateSelected(new Date('2026-07-01T12:00:00Z'));
    cmp.onSlotSelected({ time: '2026-07-01T13:00:00Z', formattedTime: '08:00' });

    cmp.clearInspection();

    expect(cmp.selectedDate()).toBeNull();
    expect(cmp.selectedSlotIso()).toBeNull();
    expect(cmp.form.get('inspectionDate')?.value).toBe('');
    expect(cmp.form.get('inspectionTime')?.value).toBe('');
  });

  it('toCreateDto coalesces empty optionals to null and forces a boolean smsConsent', () => {
    const dto = create().toCreateDto({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+15550001111',
      email: '',
      address: '123 Main St',
      address2: '',
      city: 'Houston',
      state: 'TX',
      zipcode: '77001',
      country: 'USA',
      latitude: null,
      longitude: null,
      statusLead: 'New',
      owner: '',
      registrationDate: '',
      inspectionDate: '',
      inspectionTime: '',
      smsConsent: false,
      message: '',
      notes: '',
      additionalNote: '',
    });

    expect(dto.firstName).toBe('Jane');
    expect(dto.email).toBeNull();
    expect(dto.address2).toBeNull();
    expect(dto.owner).toBeNull();
    expect(dto.inspectionDate).toBeNull();
    expect(dto.inspectionTime).toBeNull();
    expect(dto.smsConsent).toBe(false);
  });
});
