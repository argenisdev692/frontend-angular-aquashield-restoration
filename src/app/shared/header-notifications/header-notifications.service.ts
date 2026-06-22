import { Service, computed, inject, signal, PLATFORM_ID, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { ApiConfiguration } from '../../api/api-configuration';
import { formatUsPhone } from '../directives/phone-format.directive';
import { AppointmentsFeatureService } from '../../features/appointments/services/appointments-feature.service';
import { ContactSupportFeatureService } from '../../features/contact-support/services/contact-support-feature.service';
import { RetellCallsFeatureService } from '../../features/retell-calls/services/retell-calls-feature.service';
import type { AppointmentListResponse } from '../../api/models/appointment-list-response';
import type { ContactSupportListResponse } from '../../api/models/contact-support-list-response';
import type { CallListResponse } from '../../api/models/call-list-response';
import {
  HeaderNotification,
  HeaderNotificationEvent,
  HeaderNotificationFeed,
} from './header-notifications.types';

type AppointmentRow = AppointmentListResponse['data'][number];
type ContactSupportRow = ContactSupportListResponse['data'][number];
type CallRow = CallListResponse['data'][number];
type FeedSignal = WritableSignal<HeaderNotification[]>;

/** How many recent items to keep per feed in the header. */
const FEED_LIMIT = 12;
/** Polling cadence (ms) used as the fallback when the WebSocket is down. */
const POLL_INTERVAL_MS = 60_000;
/** WebSocket reconnect backoff bounds (ms). */
const WS_BACKOFF_MIN_MS = 2_000;
const WS_BACKOFF_MAX_MS = 30_000;

/**
 * Single source of truth for the three header notification feeds. Hydrates via
 * the existing feature services, keeps itself fresh with a WebSocket push
 * stream, and falls back to interval polling whenever the socket is
 * unavailable. Zoneless-safe: every update flows through signals, which alone
 * schedule change detection (no Zone.js / markForCheck needed).
 */
@Service()
export class HeaderNotificationsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiConfig = inject(ApiConfiguration);
  private readonly appointmentsSvc = inject(AppointmentsFeatureService);
  private readonly contactSvc = inject(ContactSupportFeatureService);
  private readonly retellSvc = inject(RetellCallsFeatureService);

  // ── Feed state ──────────────────────────────────────────────────────────
  readonly appointments = signal<HeaderNotification[]>([]);
  readonly contactSupport = signal<HeaderNotification[]>([]);
  readonly retell = signal<HeaderNotification[]>([]);

  readonly appointmentsUnread = computed(() => this.unread(this.appointments()));
  readonly contactSupportUnread = computed(() => this.unread(this.contactSupport()));
  readonly retellUnread = computed(() => this.unread(this.retell()));
  readonly totalUnread = computed(
    () => this.appointmentsUnread() + this.contactSupportUnread() + this.retellUnread(),
  );

  // ── Lifecycle internals ───────────────────────────────────────────────────
  private started = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = WS_BACKOFF_MIN_MS;
  private wsAlive = false;

  private static readonly houstonFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  /** Idempotent — safe to call from every header instance. Browser-only. */
  start(): void {
    if (this.started || !isPlatformBrowser(this.platformId)) return;
    this.started = true;
    void this.refresh();
    this.startPolling();
    this.connectSocket();
  }

  // ── Hydration / polling ───────────────────────────────────────────────────
  async refresh(): Promise<void> {
    const [appts, contact, calls] = await Promise.allSettled([
      this.appointmentsSvc.getAll({ limit: FEED_LIMIT }),
      this.contactSvc.getAll({ limit: FEED_LIMIT }),
      this.retellSvc.getAll({ limit: FEED_LIMIT }),
    ]);

    if (appts.status === 'fulfilled') {
      this.appointments.set(appts.value.data.map((r) => this.mapAppointment(r)));
    }
    if (contact.status === 'fulfilled') {
      this.contactSupport.set(contact.value.data.map((r) => this.mapContact(r)));
    }
    if (calls.status === 'fulfilled') {
      this.retell.set(calls.value.data.map((r) => this.mapCall(r)));
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      // Skip polling while the socket is healthy — it's the live source.
      if (!this.wsAlive) void this.refresh();
    }, POLL_INTERVAL_MS);
  }

  // ── Mark-as-read (optimistic) ─────────────────────────────────────────────
  async markRead(feed: HeaderNotificationFeed, id: string): Promise<void> {
    this.patchRead(this.signalFor(feed), id);
    try {
      switch (feed) {
        case 'appointment':
          await this.appointmentsSvc.markRead(id);
          break;
        case 'contact-support':
          await this.contactSvc.markAsRead(id);
          break;
        case 'retell':
          await this.retellSvc.markRead(id);
          break;
      }
    } catch {
      // Reconcile against the server if the optimistic update failed.
      void this.refresh();
    }
  }

  // ── WebSocket push ────────────────────────────────────────────────────────
  private connectSocket(): void {
    const url = this.socketUrl();
    if (!url || typeof WebSocket === 'undefined') return;

    try {
      this.socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.wsAlive = true;
      this.reconnectDelay = WS_BACKOFF_MIN_MS;
    };

    this.socket.onmessage = (event: MessageEvent) => {
      this.handleEvent(event.data);
    };

    this.socket.onclose = () => {
      this.wsAlive = false;
      this.socket = null;
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      // The socket also fires `close` after an error; reconnect is handled there.
      this.wsAlive = false;
    };
  }

  private scheduleReconnect(): void {
    if (!this.started || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectSocket();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, WS_BACKOFF_MAX_MS);
  }

  private handleEvent(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let event: HeaderNotificationEvent;
    try {
      event = JSON.parse(raw) as HeaderNotificationEvent;
    } catch {
      return;
    }
    if (!event?.feed || !event.payload || typeof event.payload !== 'object') return;

    const item = this.mapEvent(event);
    if (!item) return;
    this.upsert(this.signalFor(event.feed), item);
  }

  private mapEvent(event: HeaderNotificationEvent): HeaderNotification | null {
    switch (event.feed) {
      case 'appointment':
        return this.mapAppointment(event.payload as unknown as AppointmentRow);
      case 'contact-support':
        return this.mapContact(event.payload as unknown as ContactSupportRow);
      case 'retell':
        return this.mapCall(event.payload as unknown as CallRow);
      default:
        return null;
    }
  }

  // ── Mappers (source row → view-model) ─────────────────────────────────────
  private mapAppointment(r: AppointmentRow): HeaderNotification {
    const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'New appointment';
    const place = [r.city, r.state].filter(Boolean).join(', ');
    const status = r.inspectionStatus && r.inspectionStatus !== 'null' ? r.inspectionStatus : '';
    return {
      id: r.id,
      title: name,
      message: [place, status].filter(Boolean).join(' · ') || 'Inspection request',
      createdAt: r.createdAt,
      timeLabel: this.formatHouston(r.createdAt),
      isRead: r.isRead,
      routerLink: `/appointments/${r.id}`,
    };
  }

  private mapContact(r: ContactSupportRow): HeaderNotification {
    const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();
    return {
      id: r.id,
      title: r.subject?.trim() || name || 'Support request',
      message: r.message?.trim() || name,
      createdAt: r.createdAt,
      timeLabel: this.formatHouston(r.createdAt),
      isRead: r.isRead,
      routerLink: `/contact-support/${r.id}`,
    };
  }

  private mapCall(r: CallRow): HeaderNotification {
    const rawNumber = r.fromNumber || r.toNumber;
    const who = rawNumber ? formatUsPhone(rawNumber) : 'Unknown number';
    const detail = r.callSummary?.trim() || r.callStatus || r.direction || 'Retell call';
    return {
      id: r.id,
      title: `Call · ${who}`,
      message: detail,
      createdAt: r.createdAt,
      timeLabel: this.formatHouston(r.createdAt),
      isRead: r.isRead,
      routerLink: `/retell-calls/${r.id}`,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private signalFor(feed: HeaderNotificationFeed): FeedSignal {
    switch (feed) {
      case 'appointment':
        return this.appointments;
      case 'contact-support':
        return this.contactSupport;
      case 'retell':
        return this.retell;
    }
  }

  private unread(items: readonly HeaderNotification[]): number {
    return items.reduce((count, i) => (i.isRead ? count : count + 1), 0);
  }

  private patchRead(target: FeedSignal, id: string): void {
    target.update((items) =>
      items.map((i) => (i.id === id ? { ...i, isRead: true } : i)),
    );
  }

  private upsert(target: FeedSignal, item: HeaderNotification): void {
    target.update((items) => {
      const next = [item, ...items.filter((i) => i.id !== item.id)];
      next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return next.slice(0, FEED_LIMIT);
    });
  }

  private formatHouston(iso: string | null | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return HeaderNotificationsService.houstonFmt.format(date);
  }

  /** Derives `ws(s)://…/ws/notifications` from the configured API root URL. */
  private socketUrl(): string | null {
    const root = this.apiConfig.rootUrl?.trim();
    if (!root) return null;
    return `${root.replace(/^http/i, 'ws').replace(/\/+$/, '')}/ws/notifications`;
  }
}
