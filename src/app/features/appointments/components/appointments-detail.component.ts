import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  resource,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AppointmentsFeatureService } from '../services/appointments-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-appointments-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, PageHeaderComponent, SidebarComponent],
  templateUrl: './appointments-detail.component.html',
  styleUrl: './appointments-detail.component.css',
})
export class AppointmentsDetailComponent {
  private service = inject(AppointmentsFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly drawerVisible = signal(false);
  readonly appointmentId = signal<string>(this.route.snapshot.params['id']);

  readonly appointmentResource = resource({
    loader: async () => {
      const appointment = await this.service.getById(this.appointmentId());
      // Opening the detail marks the lead as read (fire-and-forget).
      if (!appointment.isRead && appointment.deletedAt === null) {
        this.service.markRead(appointment.id).catch(() => undefined);
      }
      return appointment;
    },
  });

  readonly appointment = computed(() => this.appointmentResource.value());
  readonly isLoading = computed(() => this.appointmentResource.isLoading());

  onEdit(): void {
    this.router.navigate(['/appointments', this.appointmentId(), 'edit']);
  }

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    this.service.delete(this.appointmentId()).then(() => {
      this.router.navigate(['/appointments']);
    });
  }

  onRestore(): void {
    this.service.restore(this.appointmentId()).then(() => {
      this.appointmentResource.reload();
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
