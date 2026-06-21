import { Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

/**
 * Format a raw phone string as a US national number `(xxx) xxx xxxx`.
 *
 * - Strips every non-digit.
 * - Drops a leading country code `1` (handles `+1…` and `1…`).
 * - Caps at 10 digits and formats progressively while typing.
 *
 * Pure + exported so detail/list views can reuse it without the directive.
 */
export function formatUsPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  if (digits.length > 6) return `(${area}) ${prefix} ${line}`;
  if (digits.length > 3) return `(${area}) ${prefix}`;
  if (digits.length > 0) return `(${area}`;
  return '';
}

/**
 * Live-formats a phone input to `(xxx) xxx xxxx`. Works with both Reactive
 * (`formControlName`) and template-driven (`ngModel`) forms by driving the
 * bound `NgControl` — so the formatted value is what the form submits.
 *
 * The backend re-normalizes to E.164 (`+1…`), so the formatting here is
 * purely a display/UX concern and any input shape is accepted.
 */
@Directive({
  selector: '[appPhoneFormat]',
})
export class PhoneFormatDirective implements OnInit, OnDestroy {
  private readonly ngControl = inject(NgControl, { optional: true, self: true });
  private sub?: Subscription;

  ngOnInit(): void {
    const control = this.ngControl?.control;
    if (!control) return;

    // Catches both user typing (via the value accessor) and programmatic
    // patches (edit forms calling patchValue, signal-driven `[ngModel]`).
    // The write-back keeps `emitEvent` on so downstream consumers
    // (`ngModelChange`, signals, validators) see the formatted value; the
    // `formatted !== value` guard terminates the loop because
    // `formatUsPhone` is idempotent (a second pass returns the same string).
    this.sub = control.valueChanges.subscribe((value: unknown) => {
      const formatted = formatUsPhone(typeof value === 'string' ? value : String(value ?? ''));
      if (formatted !== value) {
        control.setValue(formatted);
      }
    });

    if (control.value) {
      const formatted = formatUsPhone(String(control.value));
      if (formatted !== control.value) {
        control.setValue(formatted);
      }
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
