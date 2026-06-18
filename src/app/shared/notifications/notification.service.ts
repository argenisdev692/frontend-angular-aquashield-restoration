import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warn';

export interface Toast {
  readonly id: number;
  readonly severity: ToastSeverity;
  readonly summary: string;
  readonly detail?: string;
}

/**
 * Global, signal-driven toast feed. Zoneless-friendly (no Zone.js): the outlet
 * component renders `toasts()` reactively. Single instance (providedIn: 'root')
 * so toasts survive navigation and are shared by every feature.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private static nextId = 0;
  private readonly _toasts = signal<readonly Toast[]>([]);

  /** Read-only toast feed consumed by the notification outlet. */
  readonly toasts = this._toasts.asReadonly();

  /** Default auto-dismiss window per severity (ms). Errors linger longer. */
  private readonly lifeMs: Record<ToastSeverity, number> = {
    success: 3500,
    info: 4000,
    warn: 5000,
    error: 6000,
  };

  success(summary: string, detail?: string): void {
    this.push('success', summary, detail);
  }

  info(summary: string, detail?: string): void {
    this.push('info', summary, detail);
  }

  warn(summary: string, detail?: string): void {
    this.push('warn', summary, detail);
  }

  /**
   * Show an error toast. Accepts a plain message or any thrown/HTTP value —
   * the readable message is extracted via {@link extractMessage}.
   */
  error(error: unknown, summary = 'Something went wrong'): void {
    const detail = typeof error === 'string' ? error : extractMessage(error);
    this.push('error', summary, detail);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this._toasts.set([]);
  }

  private push(severity: ToastSeverity, summary: string, detail?: string): void {
    const id = ++NotificationService.nextId;
    this._toasts.update((list) => [...list, { id, severity, summary, detail }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => this.dismiss(id), this.lifeMs[severity]);
    }
  }
}

/** Best-effort readable message from an unknown/HTTP error value. */
export function extractMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as {
      error?: { message?: unknown };
      message?: unknown;
      statusText?: unknown;
    };
    const apiMessage = e.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
    if (Array.isArray(apiMessage) && apiMessage.length) return String(apiMessage[0]);
    if (typeof e.message === 'string' && e.message.trim()) return e.message;
    if (typeof e.statusText === 'string' && e.statusText.trim()) return e.statusText;
  }
  return 'An unexpected error occurred. Please try again.';
}
