import {
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';

import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import {
  CalendarOptions,
  EventClickArg,
  EventDropArg,
  EventInput,
  EventSourceFuncArg,
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';

import { AppointmentsFeatureService } from '../services/appointments-feature.service';
import { AvailabilityFeatureService } from '../../availability/services/availability-feature.service';
import { TimeSlot } from '../../availability/models/booking.schemas';
import { AppointmentResponse, CreateAppointmentDto } from '../../../api/models';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { ConfirmService } from '../../../shared/notifications/confirm.service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { PhoneFormatDirective } from '../../../shared/directives/phone-format.directive';
import {
  AddressAutocompleteDirective,
  PlaceSelection,
} from '../../../shared/directives/address-autocomplete.directive';

type LeadStatus = NonNullable<CreateAppointmentDto['statusLead']>;

/**
 * Opt the month calendar into day-level capacity ('full') checks. The backend
 * sizes inspection spacing with its own fixed ±7h buffer; any 15–480 value works.
 */
const SERVICE_DURATION_MINUTES = 60;
/** An inspection blocks a 7-hour window — used to size the event end. */
const INSPECTION_DURATION_MINUTES = 420;
/** Houston is the business timezone slots are computed in. */
const BUSINESS_TZ = 'America/Chicago';

/**
 * Google-Calendar–style scheduling board for inspections.
 *
 * - Real appointments (with `inspectionDate`/`inspectionTime`) render as events,
 *   colored by `inspectionStatus`.
 * - Days the Availability module reports unavailable (holiday/closed/full/past)
 *   render as muted background blocks, so free days stand out before clicking.
 * - Clicking a free day opens a quick-create dialog; clicking an event opens a
 *   details dialog with Reschedule / Delete actions; dragging an event reschedules.
 *   Delete & reschedule run through the global {@link ConfirmService} (spinner +
 *   toast), matching the rest of the CRM.
 *
 * The generated `getAll` date filter targets `createdAt`, not `inspectionDate`,
 * so we cache the active appointments and let FullCalendar's event feed filter
 * by the visible range.
 */
@Component({
  selector: 'app-appointments-calendar',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    DatePickerModule,
    DialogModule,
    FullCalendarModule,
    PageHeaderComponent,
    SidebarComponent,
    PhoneFormatDirective,
    AddressAutocompleteDirective,
  ],
  templateUrl: './appointments-calendar.component.html',
  styleUrl: './appointments-calendar.component.css',
})
export class AppointmentsCalendarComponent {
  private api = inject(AppointmentsFeatureService);
  private availability = inject(AvailabilityFeatureService);
  private confirm = inject(ConfirmService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);

  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly drawerVisible = signal(false);
  readonly isLoading = signal(false);

  readonly leadStatusOptions: LeadStatus[] = ['New', 'Called', 'Pending', 'Declined'];
  readonly minDate = new Date();

  /** FullCalendar instance — used to refetch both event sources after a mutation. */
  readonly calendar = viewChild(FullCalendarComponent);

  /** Active appointments cached; the appointment event feed reads this. */
  private readonly appointments = signal<AppointmentResponse[]>([]);
  /** YMD → reason for unavailable days in the visible range (guards day-click). */
  private readonly unavailableDays = signal<Map<string, string>>(new Map());

  readonly calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    height: 'auto',
    firstDay: 0,
    nowIndicator: true,
    editable: true,
    eventStartEditable: true,
    eventDurationEditable: false,
    dayMaxEvents: true,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventSources: [
      { events: (_info, success) => success(this.buildAppointmentEvents()) },
      {
        events: (info, success, failure) =>
          this.buildAvailabilityEvents(info).then(success).catch(failure),
      },
    ],
    dateClick: (arg) => this.onDateClick(arg),
    eventClick: (arg) => this.onEventClick(arg),
    eventDrop: (arg) => void this.onEventDrop(arg),
  };

  // ── Quick-create dialog ──
  readonly createDialogVisible = signal(false);
  readonly createSubmitting = signal(false);
  readonly createDate = signal<Date | null>(null);
  readonly createSlotIso = signal<string | null>(null);
  readonly mapsLoading = signal(false);
  readonly mapsError = signal<string | null>(null);
  readonly createForm: FormGroup = this.buildCreateForm();

  readonly createSlotsResource = resource({
    params: () => {
      const date = this.createDate();
      return date ? { date: this.toLocalYmd(date) } : undefined;
    },
    loader: ({ params }) =>
      this.availability.getTimeSlots(params.date, SERVICE_DURATION_MINUTES),
  });
  readonly createSlots = computed<TimeSlot[]>(() => this.createSlotsResource.value() ?? []);
  readonly createSlotLabel = computed(() => {
    const iso = this.createSlotIso();
    return iso ? this.formatBusinessTime(iso) : null;
  });

  // ── Details dialog ──
  readonly detailDialogVisible = signal(false);
  readonly selectedAppt = signal<AppointmentResponse | null>(null);

  // ── Reschedule dialog ──
  readonly rescheduleDialogVisible = signal(false);
  readonly rescheduleAppt = signal<AppointmentResponse | null>(null);
  readonly rescheduleDate = signal<Date | null>(null);
  readonly rescheduleSlotIso = signal<string | null>(null);
  readonly rescheduleMonth = signal<{ year: number; month: number }>(this.currentMonth());

  readonly rescheduleCalendarResource = resource({
    params: () => this.rescheduleMonth(),
    loader: ({ params }) =>
      this.availability.getCalendar(params.year, params.month, SERVICE_DURATION_MINUTES),
  });
  readonly rescheduleDisabledDates = computed<Date[]>(() =>
    (this.rescheduleCalendarResource.value() ?? [])
      .filter((day) => !day.available)
      .map((day) => this.parseYmd(day.date))
  );
  readonly rescheduleSlotsResource = resource({
    params: () => {
      const date = this.rescheduleDate();
      return date ? { date: this.toLocalYmd(date) } : undefined;
    },
    loader: ({ params }) =>
      this.availability.getTimeSlots(params.date, SERVICE_DURATION_MINUTES),
  });
  readonly rescheduleSlots = computed<TimeSlot[]>(() => this.rescheduleSlotsResource.value() ?? []);
  readonly rescheduleSlotLabel = computed(() => {
    const iso = this.rescheduleSlotIso();
    return iso ? this.formatBusinessTime(iso) : null;
  });

  constructor() {
    // FullCalendar is browser-only; defer the initial load + refetch until the
    // view (and the <full-calendar> instance) exist on the client.
    afterNextRender(() => void this.loadAppointments().then(() => this.refetch()));
  }

  // ── Event feeds ──
  private buildAppointmentEvents(): EventInput[] {
    return this.appointments()
      .filter((a) => a.inspectionDate || a.inspectionTime)
      .map((a) => this.toEvent(a));
  }

  private toEvent(a: AppointmentResponse): EventInput {
    const startIso = a.inspectionTime ?? a.inspectionDate!;
    const hasTime = !!a.inspectionTime;
    const start = new Date(startIso);
    const end = hasTime
      ? new Date(start.getTime() + INSPECTION_DURATION_MINUTES * 60_000)
      : undefined;
    return {
      id: a.id,
      title: `${a.firstName} ${a.lastName}`.trim() || 'Inspection',
      start,
      end,
      allDay: !hasTime,
      classNames: ['fc-appt', this.statusClass(a.inspectionStatus)],
      extendedProps: { appointment: a },
    };
  }

  private async buildAvailabilityEvents(info: EventSourceFuncArg): Promise<EventInput[]> {
    const months = this.monthsInRange(info.start, info.end);
    const results = await Promise.all(
      months.map((m) => this.availability.getCalendar(m.year, m.month, SERVICE_DURATION_MINUTES))
    );
    const map = new Map<string, string>();
    const events: EventInput[] = [];
    for (const days of results) {
      for (const day of days) {
        if (day.available) continue;
        const reason = day.reason ?? 'unavailable';
        map.set(day.date, reason);
        events.push({
          start: day.date,
          allDay: true,
          display: 'background',
          classNames: ['fc-day-blocked', `fc-day-blocked--${reason}`],
        });
      }
    }
    this.unavailableDays.set(map);
    return events;
  }

  private refetch(): void {
    this.calendar()?.getApi().refetchEvents();
  }

  // The appointments endpoint caps `limit` (500 → HTTP 400) and its date filter
  // targets `createdAt`, not `inspectionDate`, so we page through alive rows at a
  // safe size and let the FullCalendar feed filter by the visible range. No
  // `status` param — alive rows are the default response, which is what we want.
  private async loadAppointments(): Promise<void> {
    this.isLoading.set(true);
    try {
      const pageSize = 100;
      const all: AppointmentResponse[] = [];
      // Safety ceiling: 20 pages = 2000 appointments.
      for (let page = 1; page <= 20; page++) {
        const resp = await this.api.getAll({ page, limit: pageSize });
        const rows = resp.data ?? [];
        all.push(...rows);
        const total = resp.total ?? all.length;
        if (rows.length < pageSize || all.length >= total) break;
      }
      this.appointments.set(all);
    } catch (error) {
      this.notify.error(error, 'Failed to load appointments');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Calendar interactions ──
  private onDateClick(arg: DateClickArg): void {
    const ymd = arg.dateStr.slice(0, 10);
    const reason = this.unavailableDays().get(ymd);
    if (reason || this.parseYmd(ymd) < this.startOfToday()) {
      this.notify.info('Day not available', this.reasonLabel(reason));
      return;
    }
    this.openCreate(arg.date);
  }

  private onEventClick(arg: EventClickArg): void {
    const appt = arg.event.extendedProps['appointment'] as AppointmentResponse | undefined;
    if (appt) this.openDetails(appt);
  }

  private async onEventDrop(arg: EventDropArg): Promise<void> {
    const appt = arg.event.extendedProps['appointment'] as AppointmentResponse | undefined;
    const start = arg.event.start;
    if (!appt || !start) {
      arg.revert();
      return;
    }
    const iso = start.toISOString();
    const ok = await this.confirm.confirm({
      variant: 'primary',
      title: 'Reschedule inspection',
      message: `Move ${this.fullName(appt)}'s inspection to ${this.formatDateTime(start)}?`,
      confirmLabel: 'Reschedule',
      busyLabel: 'Rescheduling…',
      successMessage: 'Inspection rescheduled',
      action: async () => {
        await this.api.update(appt.id, { inspectionDate: iso, inspectionTime: iso });
        await this.loadAppointments();
      },
    });
    if (ok) this.refetch();
    else arg.revert();
  }

  // ── Quick-create dialog ──
  private openCreate(date: Date): void {
    this.createForm.reset({ statusLead: 'New' });
    this.createDate.set(date);
    this.createSlotIso.set(null);
    this.mapsError.set(null);
    this.createDialogVisible.set(true);
  }

  onCreateSlotSelected(slot: TimeSlot): void {
    this.createSlotIso.set(slot.time);
  }

  onPlaceSelected(place: PlaceSelection): void {
    this.createForm.patchValue({
      address: place.address,
      city: place.city,
      state: place.state,
      zipcode: place.zipcode,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    });
  }

  onAddressCleared(): void {
    this.createForm.patchValue({
      city: '',
      state: '',
      zipcode: '',
      country: '',
      latitude: null,
      longitude: null,
    });
  }

  onCreateSubmit(): void {
    const slotIso = this.createSlotIso();
    const date = this.createDate();
    if (this.createForm.invalid || !date || !slotIso) {
      this.createForm.markAllAsTouched();
      if (!slotIso) this.notify.warn('Pick a start time for the inspection.');
      return;
    }
    const v = this.createForm.getRawValue();
    const dto: CreateAppointmentDto = {
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
      inspectionDate: date.toISOString(),
      inspectionTime: slotIso,
    };
    this.createSubmitting.set(true);
    this.api
      .create(dto)
      .then(async () => {
        this.notify.success('Appointment created');
        this.createDialogVisible.set(false);
        await this.loadAppointments();
        this.refetch();
      })
      .catch((error) => this.notify.error(error, 'Failed to create appointment'))
      .finally(() => this.createSubmitting.set(false));
  }

  // ── Details dialog ──
  private openDetails(appt: AppointmentResponse): void {
    this.selectedAppt.set(appt);
    this.detailDialogVisible.set(true);
  }

  openFullRecord(): void {
    const appt = this.selectedAppt();
    if (appt) void this.router.navigate(['/appointments', appt.id]);
  }

  onDeleteSelected(): void {
    const appt = this.selectedAppt();
    if (!appt) return;
    void this.confirm
      .confirm({
        variant: 'danger',
        title: 'Delete appointment',
        message: `Delete the inspection for ${this.fullName(appt)}? You can restore it later.`,
        confirmLabel: 'Delete',
        busyLabel: 'Deleting…',
        successMessage: 'Appointment deleted',
        action: async () => {
          await this.api.delete(appt.id);
          await this.loadAppointments();
        },
      })
      .then((ok) => {
        if (ok) {
          this.detailDialogVisible.set(false);
          this.refetch();
        }
      });
  }

  // ── Reschedule dialog ──
  openReschedule(): void {
    const appt = this.selectedAppt();
    if (!appt) return;
    this.rescheduleAppt.set(appt);
    this.rescheduleSlotIso.set(null);
    if (appt.inspectionDate) {
      const day = this.parseYmd(appt.inspectionDate.slice(0, 10));
      this.rescheduleDate.set(day);
      this.rescheduleMonth.set({ year: day.getFullYear(), month: day.getMonth() + 1 });
    } else {
      this.rescheduleDate.set(null);
      this.rescheduleMonth.set(this.currentMonth());
    }
    this.detailDialogVisible.set(false);
    this.rescheduleDialogVisible.set(true);
  }

  onRescheduleDateSelected(date: Date): void {
    this.rescheduleDate.set(date);
    this.rescheduleSlotIso.set(null);
  }

  onRescheduleMonthChange(event: { month?: number; year?: number }): void {
    if (event.month == null || event.year == null) return;
    this.rescheduleMonth.set({ year: event.year, month: event.month });
  }

  onRescheduleSlotSelected(slot: TimeSlot): void {
    this.rescheduleSlotIso.set(slot.time);
  }

  onRescheduleSubmit(): void {
    const appt = this.rescheduleAppt();
    const date = this.rescheduleDate();
    const slotIso = this.rescheduleSlotIso();
    if (!appt || !date || !slotIso) {
      this.notify.warn('Pick a date and a start time.');
      return;
    }
    void this.confirm
      .confirm({
        variant: 'primary',
        title: 'Reschedule inspection',
        message: `Reschedule ${this.fullName(appt)}'s inspection to ${this.formatBusinessTime(
          slotIso
        )} on ${this.toLocalYmd(date)}?`,
        confirmLabel: 'Reschedule',
        busyLabel: 'Rescheduling…',
        successMessage: 'Inspection rescheduled',
        action: async () => {
          await this.api.update(appt.id, {
            inspectionDate: date.toISOString(),
            inspectionTime: slotIso,
          });
          await this.loadAppointments();
        },
      })
      .then((ok) => {
        if (ok) {
          this.rescheduleDialogVisible.set(false);
          this.refetch();
        }
      });
  }

  // ── Navigation ──
  goToList(): void {
    void this.router.navigate(['/appointments']);
  }

  // ── Display helpers ──
  fullName(appt: AppointmentResponse): string {
    return `${appt.firstName} ${appt.lastName}`.trim();
  }

  location(appt: AppointmentResponse): string {
    return [appt.city, appt.state].filter(Boolean).join(', ') || '—';
  }

  inspectionLabel(appt: AppointmentResponse): string {
    if (appt.inspectionTime) {
      return `${this.formatBusinessDate(appt.inspectionTime)} · ${this.formatBusinessTime(
        appt.inspectionTime
      )}`;
    }
    if (appt.inspectionDate) return this.formatBusinessDate(appt.inspectionDate);
    return 'Not scheduled';
  }

  statusBadgeClass(appt: AppointmentResponse): string {
    return `status-badge ${this.statusClass(appt.inspectionStatus)}`;
  }

  private statusClass(status: AppointmentResponse['inspectionStatus'] | undefined): string {
    switch (status) {
      case 'Confirmed':
        return 'fc-appt-confirmed';
      case 'Completed':
        return 'fc-appt-completed';
      case 'Declined':
        return 'fc-appt-declined';
      case 'Pending':
        return 'fc-appt-pending';
      default:
        return 'fc-appt-default';
    }
  }

  private reasonLabel(reason: string | undefined): string {
    switch (reason) {
      case 'full':
        return 'This day is fully booked.';
      case 'past':
        return 'This day is in the past.';
      case 'holiday':
      case 'exception':
        return 'Closed for a holiday or exception.';
      case 'closed':
        return 'Closed on this weekday.';
      default:
        return 'No availability on this day.';
    }
  }

  // ── Date helpers (mirror the booking form) ──
  private formatBusinessTime(iso: string): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  }

  private formatBusinessDate(iso: string): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TZ,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TZ,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
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

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private currentMonth(): { year: number; month: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  private monthsInRange(start: Date, end: Date): Array<{ year: number; month: number }> {
    const months: Array<{ year: number; month: number }> = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    // `end` is exclusive in FullCalendar; step back one day to avoid an extra month.
    const last = new Date(end.getTime() - 1);
    while (cursor <= last) {
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }

  private buildCreateForm(): FormGroup {
    return this.fb.group({
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
    });
  }
}
