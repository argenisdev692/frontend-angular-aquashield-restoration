import {
  Component,
  inject,
  input,
  signal,
  computed,
  resource,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { AvailabilityFeatureService } from '../services/availability-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { ConfirmService } from '../../../shared/notifications/confirm.service';

@Component({
  selector: 'app-availability-exception-detail',
  imports: [DatePipe, PageHeaderComponent, SidebarComponent],
  templateUrl: './availability-exception-detail.component.html',
  styleUrl: './availability-exception-detail.component.css',
})
export class AvailabilityExceptionDetailComponent {
  private service = inject(AvailabilityFeatureService);
  private router = inject(Router);
  private confirm = inject(ConfirmService);

  /** Route param bound as a signal input (v22 + withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly drawerVisible = signal(false);
  readonly exceptionId = computed(() => this.id());

  readonly exceptionResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.service.getById(params),
  });

  readonly exception = computed(() => this.exceptionResource.value());
  readonly isLoading = computed(() => this.exceptionResource.isLoading());

  onEdit(): void {
    this.router.navigate(['/availability/exceptions', this.exceptionId(), 'edit']);
  }

  onDelete(): void {
    this.confirm.confirm({
      variant: 'danger',
      title: 'Delete exception',
      message: 'Are you sure you want to delete this exception? You can restore it later.',
      confirmLabel: 'Delete',
      busyLabel: 'Deleting…',
      successMessage: 'Exception deleted',
      action: async () => {
        await this.service.delete(this.exceptionId());
        this.router.navigate(['/availability/exceptions']);
      },
    });
  }

  onRestore(): void {
    this.confirm.confirm({
      variant: 'success',
      title: 'Restore exception',
      message: 'Restore this exception?',
      confirmLabel: 'Restore',
      busyLabel: 'Restoring…',
      successMessage: 'Exception restored',
      action: async () => {
        await this.service.restore(this.exceptionId());
        this.exceptionResource.reload();
      },
    });
  }

  onBack(): void {
    this.router.navigate(['/availability/exceptions']);
  }

  isDeleted(): boolean {
    return this.exception()?.deletedAt !== null && this.exception()?.deletedAt !== undefined;
  }
}
