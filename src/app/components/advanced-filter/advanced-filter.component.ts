import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { AnimatedButtonComponent } from '../animated-button/animated-button.component';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'date-range' | 'text' | 'trash';
  options?: FilterOption[];
  placeholder?: string;
}

export interface FilterCriteria {
  search: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-advanced-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerModule, SelectModule, AnimatedButtonComponent],
  templateUrl: './advanced-filter.component.html',
  styleUrl: './advanced-filter.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedFilterComponent {
  // ── Inputs ────────────────────────────────
  /** Placeholder text for the search input. */
  readonly searchPlaceholder = input<string>('Search...');

  /** Extra filter fields shown in the advanced panel. */
  readonly fields = input<FilterField[]>([]);

  /** Whether to show the PDF export button. */
  readonly showExportPdf = input<boolean>(true);

  /** Whether to show the Excel export button. */
  readonly showExportExcel = input<boolean>(true);

  /** Whether to show the Create button. */
  readonly showCreate = input<boolean>(true);

  /** Label for the Create button. */
  readonly createLabel = input<string>('New');

  // ── Outputs ───────────────────────────────
  readonly filtersChange = output<FilterCriteria>();
  readonly create = output<void>();
  readonly exportPdf = output<void>();
  readonly exportExcel = output<void>();

  // ── State (signals) ───────────────────────
  readonly search = signal('');
  readonly advancedOpen = signal(false);

  /** Dynamic filter values stored by field key. */
  readonly filterValues = signal<Record<string, unknown>>({});

  /** Count of active advanced filters (excluding search). */
  readonly activeCount = computed(() => {
    const values = this.filterValues();
    const fields = this.fields();
    let count = 0;
    for (const field of fields) {
      const val = values[field.key];
      if (val === undefined || val === null) continue;
      if (Array.isArray(val) && val.length === 0) continue;
      if (typeof val === 'string' && val.trim() === '') continue;
      count++;
    }
    return count;
  });

  private debounce?: ReturnType<typeof setTimeout>;

  onSearchInput(value: string): void {
    this.search.set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.emit(), 300);
  }

  toggleAdvanced(): void {
    this.advancedOpen.update((v) => !v);
  }

  apply(): void {
    this.emit();
    this.advancedOpen.set(false);
  }

  clear(): void {
    this.search.set('');
    this.filterValues.set({});
    this.emit();
  }

  /** Update a single filter field value. */
  setFilterValue(key: string, value: unknown): void {
    this.filterValues.update((current) => ({
      ...current,
      [key]: value,
    }));
  }

  /** Get the current value for a filter field. */
  getFilterValue(key: string): unknown {
    return this.filterValues()[key];
  }

  /** Set value and immediately emit (for selects / datepickers). */
  onFieldChange(key: string, value: unknown): void {
    this.setFilterValue(key, value);
    this.emit();
  }

  emit(): void {
    this.filtersChange.emit({
      search: this.search().trim(),
      ...this.filterValues(),
    });
  }
}
