import { Injectable, computed, inject, signal } from '@angular/core';
import { NotificationService } from './notification.service';

export type ConfirmVariant = 'danger' | 'success' | 'primary';

export interface ConfirmRequest {
  /** Modal title, e.g. "Delete user". */
  readonly title: string;
  /** Body message / warning shown to the user. */
  readonly message: string;
  /** Accept-button label in its idle state. Default: "Confirm". */
  readonly confirmLabel?: string;
  /** Cancel-button label. Default: "Cancel". */
  readonly cancelLabel?: string;
  /** Accept-button label while the action runs, e.g. "Deleting…". */
  readonly busyLabel?: string;
  /** Visual intent of the accept button. Default: "primary". */
  readonly variant?: ConfirmVariant;
  /**
   * Async work to run when the user accepts. The modal stays open showing a
   * busy spinner until this resolves. On rejection the modal closes and an
   * error toast is shown.
   */
  readonly action: () => Promise<unknown>;
  /** Toast summary shown on success. When omitted no success toast fires. */
  readonly successMessage?: string;
}

interface ConfirmState extends ConfirmRequest {
  readonly open: boolean;
  readonly busy: boolean;
}

/**
 * Global confirm modal with an in-progress state. Unlike a plain confirm(),
 * the dialog runs the destructive/restore action itself and keeps the spinner
 * visible ("Deleting…" / "Restoring…") until it settles, then auto-closes and
 * reports the outcome via {@link NotificationService}.
 *
 * Signal-driven and providedIn: 'root' so a single <app-notification-outlet>
 * renders it for the whole app.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly notify = inject(NotificationService);

  private readonly _state = signal<ConfirmState | null>(null);
  readonly state = this._state.asReadonly();
  readonly isOpen = computed(() => this._state()?.open ?? false);
  readonly isBusy = computed(() => this._state()?.busy ?? false);

  /**
   * Open the modal and resolve to `true` only when the user accepts AND the
   * action succeeds; `false` if cancelled or the action fails.
   */
  confirm(request: ConfirmRequest): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this._state.set({ ...request, open: true, busy: false });
      this.resolveCurrent = resolve;
    });
  }

  private resolveCurrent: ((value: boolean) => void) | null = null;

  /** Called by the outlet when the user confirms. */
  async accept(): Promise<void> {
    const current = this._state();
    if (!current || current.busy) return;

    this._state.set({ ...current, busy: true });
    try {
      await current.action();
      if (current.successMessage) this.notify.success(current.successMessage);
      this.settle(true);
    } catch (error) {
      this.notify.error(error);
      this.settle(false);
    }
  }

  /** Called by the outlet when the user cancels / dismisses. */
  cancel(): void {
    const current = this._state();
    if (!current || current.busy) return; // can't cancel mid-flight
    this.settle(false);
  }

  private settle(result: boolean): void {
    this._state.set(null);
    this.resolveCurrent?.(result);
    this.resolveCurrent = null;
  }
}
