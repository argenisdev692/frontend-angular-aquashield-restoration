import {
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AvailabilityFeatureService } from '../services/availability-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { AvailabilityRuleResponse } from '../models/availability.types';

interface RuleRow {
  dayOfWeek: number;
  label: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

@Component({
  selector: 'app-availability-rules',
  imports: [RouterLink, PageHeaderComponent, SidebarComponent],
  templateUrl: './availability-rules.component.html',
  styleUrl: './availability-rules.component.css',
})
export class AvailabilityRulesComponent {
  private service = inject(AvailabilityFeatureService);
  private notify = inject(NotificationService);

  readonly drawerVisible = signal(false);
  readonly savingDay = signal<number | null>(null);

  // Editable per-day state, seeded from the API and defaulted for missing days.
  readonly rows = signal<RuleRow[]>(
    DAY_LABELS.map((label, dayOfWeek) => ({
      dayOfWeek,
      label,
      isAvailable: false,
      startTime: '09:00',
      endTime: '17:00',
    }))
  );

  private readonly rulesResource = resource({
    loader: () => this.service.getRules(),
  });

  readonly isLoading = computed(() => this.rulesResource.isLoading());

  constructor() {
    // Merge loaded rules into the editable rows whenever the resource resolves.
    effect(() => {
      const rules = this.rulesResource.value();
      if (!rules) return;
      const byDay = new Map<number, AvailabilityRuleResponse>(
        rules.map((rule) => [rule.dayOfWeek, rule])
      );
      this.rows.update((rows) =>
        rows.map((row) => {
          const rule = byDay.get(row.dayOfWeek);
          if (!rule) return row;
          return {
            ...row,
            isAvailable: rule.isAvailable,
            startTime: rule.startTime?.slice(0, 5) ?? row.startTime,
            endTime: rule.endTime?.slice(0, 5) ?? row.endTime,
          };
        })
      );
    });
  }

  setAvailable(dayOfWeek: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.patchRow(dayOfWeek, { isAvailable: checked });
  }

  setStart(dayOfWeek: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchRow(dayOfWeek, { startTime: value });
  }

  setEnd(dayOfWeek: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchRow(dayOfWeek, { endTime: value });
  }

  private patchRow(dayOfWeek: number, patch: Partial<RuleRow>): void {
    this.rows.update((rows) =>
      rows.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row))
    );
  }

  async saveRow(dayOfWeek: number): Promise<void> {
    const row = this.rows().find((r) => r.dayOfWeek === dayOfWeek);
    if (!row) return;
    this.savingDay.set(dayOfWeek);
    try {
      await this.service.upsertRule(dayOfWeek, {
        isAvailable: row.isAvailable,
        startTime: row.startTime,
        endTime: row.endTime,
      });
      this.notify.success(`${row.label} schedule saved`);
    } catch (error) {
      this.notify.error(error, 'Failed to save schedule');
    } finally {
      this.savingDay.set(null);
    }
  }
}
