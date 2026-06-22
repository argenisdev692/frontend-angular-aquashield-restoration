/**
 * View-model for a single header notification, normalized across the three
 * source feeds (appointments, contact-support, retell calls) so the header
 * dropdowns can render them uniformly and navigate to each item's detail page.
 */
export type HeaderNotificationFeed = 'appointment' | 'contact-support' | 'retell';

export interface HeaderNotification {
  /** Entity id — also the detail-route param. */
  readonly id: string;
  /** Primary line (e.g. contact name / subject). */
  readonly title: string;
  /** Secondary snippet line. */
  readonly message: string;
  /** Raw ISO timestamp (used for sorting). */
  readonly createdAt: string;
  /** Pre-formatted date+time in the Houston (America/Chicago) zone. */
  readonly timeLabel: string;
  readonly isRead: boolean;
  /** Absolute detail route, e.g. `/appointments/{id}`. */
  readonly routerLink: string;
}

/**
 * Real-time push envelope expected from the backend WebSocket gateway.
 * Contract (frontend side): `{ feed, type, payload }` where `payload` is the
 * source entity for that feed. Unknown shapes are ignored defensively.
 */
export interface HeaderNotificationEvent {
  readonly feed: HeaderNotificationFeed;
  readonly type: 'created' | 'updated' | 'read';
  readonly payload: Record<string, unknown>;
}
