import {
  Component,
  inject,
  input,
  signal,
  computed,
  effect,
  resource,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { AppointmentsFeatureService } from '../services/appointments-feature.service';
import { ConfirmService } from '../../../shared/notifications/confirm.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-appointments-detail',
  imports: [DatePipe, PageHeaderComponent, SidebarComponent],
  templateUrl: './appointments-detail.component.html',
  styleUrl: './appointments-detail.component.css',
})
export class AppointmentsDetailComponent {
  private service = inject(AppointmentsFeatureService);
  private router = inject(Router);
  private confirm = inject(ConfirmService);

  /** Route param bound via `withComponentInputBinding()` (route is `:id`). */
  readonly id = input.required<string>();

  readonly drawerVisible = signal(false);

  readonly appointmentResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.service.getById(params),
  });

  readonly appointment = computed(() => this.appointmentResource.value());
  readonly isLoading = computed(() => this.appointmentResource.isLoading());

  // Mark the lead as read once it loads (fire-and-forget side effect kept out of
  // the resource loader). Guard by id so a reload/restore doesn't re-fire it.
  private markedReadId: string | null = null;

  constructor() {
    effect(() => {
      const a = this.appointment();
      if (a && !a.isRead && a.deletedAt === null && this.markedReadId !== a.id) {
        this.markedReadId = a.id;
        this.service.markRead(a.id).catch(() => undefined);
      }
    });
  }

  onEdit(): void {
    this.router.navigate(['/appointments', this.id(), 'edit']);
  }

  onDelete(): void {
    this.confirm.confirm({
      variant: 'danger',
      title: 'Delete appointment',
      message: 'Are you sure you want to delete this appointment? You can restore it later.',
      confirmLabel: 'Delete',
      busyLabel: 'Deleting…',
      successMessage: 'Appointment deleted',
      action: async () => {
        await this.service.delete(this.id());
        this.router.navigate(['/appointments']);
      },
    });
  }

  onRestore(): void {
    this.confirm.confirm({
      variant: 'success',
      title: 'Restore appointment',
      message: 'Restore this appointment?',
      confirmLabel: 'Restore',
      busyLabel: 'Restoring…',
      successMessage: 'Appointment restored',
      action: async () => {
        await this.service.restore(this.id());
        this.appointmentResource.reload();
      },
    });
  }

  onBack(): void {
    this.router.navigate(['/appointments']);
  }

  isDeleted(): boolean {
    return this.appointment()?.deletedAt !== null;
  }

  fullName(): string {
    const a = this.appointment();
    return a ? `${a.firstName} ${a.lastName}`.trim() : 'Appointment Detail';
  }

  fullAddress(): string {
    const a = this.appointment();
    if (!a) return '—';
    return [a.address, a.address2, a.city, a.state, a.zipcode, a.country]
      .filter(Boolean)
      .join(', ');
  }
}
