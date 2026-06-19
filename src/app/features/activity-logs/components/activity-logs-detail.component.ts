import {
  Component,
  inject,
  signal,
  computed,
  resource,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { ActivityLogsFeatureService } from '../services/activity-logs-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-activity-logs-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, JsonPipe, ButtonModule, PageHeaderComponent, SidebarComponent],
  templateUrl: './activity-logs-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './activity-logs-detail.component.css',
})
export class ActivityLogsDetailComponent {
  private service = inject(ActivityLogsFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly drawerVisible = signal(false);
  readonly logId = signal<string>(this.route.snapshot.params['id']);

  readonly logResource = resource({
    loader: () => this.service.getById(this.logId()),
  });

  readonly log = computed(() => this.logResource.value());
  readonly isLoading = computed(() => this.logResource.isLoading());

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this activity log?')) return;
    this.service.delete(this.logId()).then(() => {
      this.router.navigate(['/activity-logs']);
    });
  }

  onBack(): void {
    this.router.navigate(['/activity-logs']);
  }
}
