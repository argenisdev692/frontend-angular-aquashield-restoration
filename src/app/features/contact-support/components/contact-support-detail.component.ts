import {
  Component,
  inject,
  signal,
  computed,
  resource,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { ContactSupportFeatureService } from '../services/contact-support-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-contact-support-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, PageHeaderComponent, SidebarComponent],
  templateUrl: './contact-support-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './contact-support-detail.component.css',
})
export class ContactSupportDetailComponent {
  private service = inject(ContactSupportFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly drawerVisible = signal(false);
  readonly requestId = signal<string>(this.route.snapshot.params['id']);

  readonly requestResource = resource({
    loader: () => this.service.getById(this.requestId()),
  });

  readonly request = computed(() => this.requestResource.value());
  readonly isLoading = computed(() => this.requestResource.isLoading());
  readonly isDeleted = computed(() => this.request()?.deletedAt !== null);

  readonly fullName = computed(() => {
    const r = this.request();
    if (!r) return '—';
    return `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '—';
  });

  readonly initial = computed(() => {
    const name = this.fullName();
    return name === '—' ? '?' : name.charAt(0).toUpperCase();
  });

  onMarkAsRead(): void {
    this.service.markAsRead(this.requestId()).then(() => {
      this.requestResource.reload();
    });
  }

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this support request?')) return;
    this.service.delete(this.requestId()).then(() => {
      this.router.navigate(['/contact-support']);
    });
  }

  onRestore(): void {
    this.service.restore(this.requestId()).then(() => {
      this.requestResource.reload();
    });
  }

  onBack(): void {
    this.router.navigate(['/contact-support']);
  }
}
