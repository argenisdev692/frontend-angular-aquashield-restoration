import {
  Component,
  computed,
  inject,
  resource,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { CampaignsFeatureService } from '../services/campaigns-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CampaignStageExport, statusToneClass } from '../models/campaigns.types';

@Component({
  selector: 'app-campaigns-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, PageHeaderComponent, SidebarComponent],
  templateUrl: './campaigns-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './campaigns-detail.component.css',
})
export class CampaignsDetailComponent {
  private service = inject(CampaignsFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly drawerVisible = signal(false);
  readonly campaignId = signal<string>(this.route.snapshot.params['id']);

  readonly campaignResource = resource({
    loader: () => this.service.getById(this.campaignId()),
  });

  readonly campaign = computed(() => this.campaignResource.value());
  readonly isLoading = computed(() => this.campaignResource.isLoading());
  readonly hasError = computed(() => this.campaignResource.status() === 'error');

  /** True while the job is still running — drives the "Refresh" affordance. */
  readonly isInProgress = computed(() => {
    const status = this.campaign()?.status;
    return status === 'pending' || status === 'processing';
  });

  statusTone(): string {
    const status = this.campaign()?.status;
    return status ? statusToneClass(status) : '';
  }

  hasDownload(stage: CampaignStageExport): boolean {
    return !!stage.zipUrl;
  }

  onRefresh(): void {
    this.campaignResource.reload();
  }

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    this.service.delete(this.campaignId()).then(() => {
      this.router.navigate(['/campaigns']);
    });
  }

  onBack(): void {
    this.router.navigate(['/campaigns']);
  }
}
