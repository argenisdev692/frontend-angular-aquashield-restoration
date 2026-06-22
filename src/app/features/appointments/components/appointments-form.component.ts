import { Component, computed, inject, resource, signal } from '@angular/core';
import {
  AbstractControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';

import { AppointmentsFeatureService } from '../services/appointments-feature.service';
import { AvailabilityFeatureService } from '../../availability/services/availability-feature.service';
import { TimeSlot } from '../../availability/models/booking.schemas';
import {
  AppointmentResponse,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from '../../../api/models';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudFormBase } from '../../../shared/crud-form-base';
import { PhoneFormatDirective } from '../../../shared/directives/phone-format.directive';
import {
  AddressAutocompleteDirective,
  PlaceSelection,
} from '../../../shared/directives/address-autocomplete.directive';

type LeadStatus = NonNullable<CreateAppointmentDto['statusLead']>;

/** Raw value emitted by the reactive form (all controls are string/boolean). */
interface AppointmentFormValue {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  statusLead: LeadStatus;
  owner: string;
  inspectionDate: string;
  inspectionTime: string;
  smsConsent: boolean;
  message: string;
  notes: string;
  additionalNote: string;
}

/**
 * Sent as `serviceDuration` to the availability API. The backend no longer uses
 * it to size slots — inspection spacing is its fixed ±7h buffer and the latest
 * start is capped at 4 PM there — but a truthy value opts the month calendar into
 * day-level capacity ('full') computation. Any value in the 15–480 range works.
 */
const SERVICE_DURATION_MINUTES = 60;
/** Houston is the business timezone the slots are computed in. */
const BUSINESS_TZ = 'America/Chicago';

@Component({
  selector: 'app-appointments-form',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    DatePickerModule,
    PageHeaderComponent,
    SidebarComponent,
    PhoneFormatDirective,
    AddressAutocompleteDirective,
  ],
  templateUrl: './appointments-form.component.html',
  styleUrl: './appointments-form.component.css',
})
export class AppointmentsFormComponent extends CrudFormBase<
  AppointmentResponse,
  CreateAppointmentDto,
  UpdateAppointmentDto
> {
  protected api = inject(AppointmentsFeatureService);
  private availability = inject(AvailabilityFeatureService);

  readonly drawerVisible = signal(false);

  readonly leadStatusOptions: LeadStatus[] = ['New', 'Called', 'Pending', 'Declined'];

  // ── Address autocomplete state ──
  readonly mapsLoading = signal(false);
  readonly mapsError = signal<string | null>(null);

  // ── Inspection scheduling state ──
  /** Day bound to the inline calendar; drives the time-slot query. */
  readonly selectedDate = signal<Date | null>(null);
  /** ISO start of the chosen slot (what we persist to `inspectionTime`). */
  readonly selectedSlotIso = signal<string | null>(null);
  /** Month shown by the calendar — refetches day-level availability on navigation. */
  readonly calendarMonth = signal<{ year: number; month: number }>(this.currentMonth());
  /** Block past days in the picker (the backend also marks them unavailable). */
  readonly minDate = new Date();

  // Day-level availability for the visible month → disabled calendar dates.
  // Passing a service duration opts the calendar into capacity checks, so days
  // fully consumed by existing appointments (±7h buffer) come back unavailable
  // and render blocked — not just holidays/exceptions/closed weekdays.
  readonly calendarResource = resource({
    params: () => this.calendarMonth(),
    loader: ({ params }) =>
      this.availability.getCalendar(params.year, params.month, SERVICE_DURATION_MINUTES),
  });

  readonly disabledDates = computed<Date[]>(() =>
    (this.calendarResource.value() ?? [])
      .filter((day) => !day.available)
      .map((day) => this.parseYmd(day.date))
  );

  // 30-min start slots for the selected day. The backend already opens every
  // start from 08:00 to the 4 PM cutoff and removes any within ±7h of an
  // existing appointment, so the list is used as-is.
  readonly slotsResource = resource({
    params: () => {
      const date = this.selectedDate();
      return date ? { date: this.toLocalYmd(date) } : undefined;
    },
    loader: ({ params }) =>
      this.availability.getTimeSlots(params.date, SERVICE_DURATION_MINUTES),
  });

  readonly slots = computed<TimeSlot[]>(() => this.slotsResource.value() ?? []);

  readonly selectedSlotLabel = computed(() => {
    const iso = this.selectedSlotIso();
    return iso ? this.formatBusinessTime(iso) : null;
  });

  get service() {
    return this.api;
  }

  buildForm(): FormGroup {
    return this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        phone: ['', [Validators.required]],
        email: ['', [Validators.email]],
        address: ['', [Validators.required]],
        address2: [''],
        city: ['', [Validators.required]],
        state: ['', [Validators.required]],
        zipcode: ['', [Validators.required]],
        country: ['', [Validators.required]],
        latitude: [null as number | null],
        longitude: [null as number | null],
        statusLead: ['New' as LeadStatus],
        owner: [''],
        inspectionDate: [''],
        inspectionTime: [''],
        smsConsent: [false],
        message: [''],
        notes: [''],
        additionalNote: [''],
      },
      { validators: this.inspectionPairValidator }
    );
  }

  patchFromEntity(entity: AppointmentResponse, form: FormGroup): void {
    form.patchValue({
      firstName: entity.firstName,
      lastName: entity.lastName,
      phone: entity.phone,
      email: entity.email ?? '',
      address: entity.address,
      address2: entity.address2 ?? '',
      city: entity.city,
      state: entity.state,
      zipcode: entity.zipcode,
      country: entity.country,
      latitude: entity.latitude ?? null,
      longitude: entity.longitude ?? null,
      statusLead: entity.statusLead && entity.statusLead !== 'null' ? entity.statusLead : 'New',
      owner: entity.owner ?? '',
      inspectionDate: entity.inspectionDate ?? '',
      inspectionTime: entity.inspectionTime ?? '',
      smsConsent: entity.smsConsent,
      message: entity.message ?? '',
      notes: entity.notes ?? '',
      additionalNote: entity.additionalNote ?? '',
    });

    // Re-hydrate the booking UI from the saved inspection date/time.
    if (entity.inspectionDate) {
      const day = this.parseYmd(entity.inspectionDate.slice(0, 10));
      this.selectedDate.set(day);
      this.calendarMonth.set({ year: day.getFullYear(), month: day.getMonth() + 1 });
    }
    this.selectedSlotIso.set(entity.inspectionTime ?? null);
  }

  toCreateDto(v: AppointmentFormValue): CreateAppointmentDto {
    return {
      firstName: v.firstName,
      lastName: v.lastName,
      phone: v.phone,
      email: v.email || null,
      address: v.address,
      address2: v.address2 || null,
      city: v.city,
      state: v.state,
      zipcode: v.zipcode,
      country: v.country,
      latitude: v.latitude,
      longitude: v.longitude,
      statusLead: v.statusLead,
      owner: v.owner || null,
      inspectionDate: v.inspectionDate || null,
      inspectionTime: v.inspectionTime || null,
      smsConsent: !!v.smsConsent,
      message: v.message || null,
      notes: v.notes || null,
      additionalNote: v.additionalNote || null,
    };
  }

  toUpdateDto(v: AppointmentFormValue): UpdateAppointmentDto {
    return this.toCreateDto(v);
  }

  get listRoute(): string {
    return '/appointments';
  }

  // ── Address autocomplete ──
  onPlaceSelected(place: PlaceSelection): void {
    this.form.patchValue({
      address: place.address,
      city: place.city,
      state: place.state,
      zipcode: place.zipcode,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    });
  }

  /** Clearing the street input wipes the autofilled dependent fields. */
  onAddressCleared(): void {
    this.form.patchValue({
      city: '',
      state: '',
      zipcode: '',
      country: '',
      latitude: null,
      longitude: null,
    });
  }

  // ── Booking interactions ──
  onDateSelected(date: Date): void {
    this.selectedDate.set(date);
    // Persist the day as an ISO datetime (backend validates `z.string().datetime()`).
    this.form.get('inspectionDate')?.setValue(date.toISOString());
    // A new day invalidates any previously chosen time.
    this.selectedSlotIso.set(null);
    this.form.get('inspectionTime')?.setValue('');
  }

  onSlotSelected(slot: TimeSlot): void {
    this.selectedSlotIso.set(slot.time);
    const control = this.form.get('inspectionTime');
    control?.setValue(slot.time);
    control?.markAsTouched();
  }

  onMonthChange(event: { month?: number; year?: number }): void {
    // PrimeNG emits month as 1–12, matching the calendar endpoint.
    if (event.month == null || event.year == null) return;
    this.calendarMonth.set({ year: event.year, month: event.month });
  }

  clearInspection(): void {
    this.selectedDate.set(null);
    this.selectedSlotIso.set(null);
    this.form.get('inspectionDate')?.setValue('');
    this.form.get('inspectionTime')?.setValue('');
  }

  // ── Helpers ──
  // Must be a prototype method (not an arrow field): `CrudFormBase` runs
  // `form = this.buildForm()` during base construction, before this subclass's
  // field initializers — an arrow-field validator would still be `undefined`
  // there and silently never wire up.
  private inspectionPairValidator(group: AbstractControl): ValidationErrors | null {
    const date = group.get('inspectionDate')?.value;
    const time = group.get('inspectionTime')?.value;
    return date && !time ? { inspectionTimeRequired: true } : null;
  }

  private formatBusinessTime(iso: string): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  }

  private toLocalYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseYmd(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  }

  private currentMonth(): { year: number; month: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
}
