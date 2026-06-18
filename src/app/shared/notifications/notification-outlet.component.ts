import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { ConfirmService } from './confirm.service';
import { NotificationService } from './notification.service';

/**
 * Single global outlet for toasts + the confirm modal. Rendered once in
 * app.html. Pure signals (zoneless) and styled exclusively with styles.css
 * design tokens via the .aq-toast-* / .aq-confirm-* classes.
 */
@Component({
  selector: 'app-notification-outlet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    <!-- Toast stack -->
    <div class="aq-toast-stack" role="region" aria-label="Notifications" aria-live="polite">
      @for (toast of notify.toasts(); track toast.id) {
        <div class="aq-toast" [class]="'aq-toast--' + toast.severity" role="status">
          <span class="aq-toast__icon" aria-hidden="true">
            @switch (toast.severity) {
              @case ('success') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              }
              @case ('error') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              }
              @case ('warn') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              }
              @default {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              }
            }
          </span>
          <div class="aq-toast__body">
            <p class="aq-toast__summary">{{ toast.summary }}</p>
            @if (toast.detail) {
              <p class="aq-toast__detail">{{ toast.detail }}</p>
            }
          </div>
          <button
            type="button"
            class="aq-toast__close"
            (click)="notify.dismiss(toast.id)"
            aria-label="Dismiss notification">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      }
    </div>

    <!-- Confirm modal -->
    @if (confirm.state(); as state) {
      <div class="aq-confirm-backdrop" (click)="confirm.cancel()">
        <div
          class="aq-confirm"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'aq-confirm-title'"
          [attr.aria-describedby]="'aq-confirm-message'"
          (click)="$event.stopPropagation()">
          <div class="aq-confirm__icon" [class]="'aq-confirm__icon--' + (state.variant ?? 'primary')" aria-hidden="true">
            @switch (state.variant) {
              @case ('danger') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              }
              @case ('success') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              }
              @default {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              }
            }
          </div>
          <h2 id="aq-confirm-title" class="aq-confirm__title">{{ state.title }}</h2>
          <p id="aq-confirm-message" class="aq-confirm__message">{{ state.message }}</p>
          <div class="aq-confirm__actions">
            <button
              type="button"
              class="aq-confirm__btn aq-confirm__btn--cancel"
              (click)="confirm.cancel()"
              [disabled]="state.busy">
              {{ state.cancelLabel ?? 'Cancel' }}
            </button>
            <button
              #acceptBtn
              type="button"
              class="aq-confirm__btn"
              [class]="'aq-confirm__btn--' + (state.variant ?? 'primary')"
              (click)="confirm.accept()"
              [disabled]="state.busy">
              @if (state.busy) {
                <span class="aq-confirm__spinner" aria-hidden="true"></span>
                {{ state.busyLabel ?? 'Working…' }}
              } @else {
                {{ state.confirmLabel ?? 'Confirm' }}
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class NotificationOutletComponent {
  readonly notify = inject(NotificationService);
  readonly confirm = inject(ConfirmService);

  private readonly acceptBtn = viewChild<ElementRef<HTMLButtonElement>>('acceptBtn');

  constructor() {
    // Move focus into the dialog when it opens (a11y).
    effect(() => {
      if (this.confirm.isOpen()) {
        queueMicrotask(() => this.acceptBtn()?.nativeElement.focus());
      }
    });
  }

  onEscape(): void {
    this.confirm.cancel();
  }
}
