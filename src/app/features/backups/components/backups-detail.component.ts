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

import { BackupsFeatureService } from '../services/backups-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-backups-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, PageHeaderComponent, SidebarComponent],
  templateUrl: './backups-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './backups-detail.component.css',
})
export class BackupsDetailComponent {
  private service = inject(BackupsFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly drawerVisible = signal(false);
  readonly backupId = signal<string>(this.route.snapshot.params['id']);

  readonly backupResource = resource({
    loader: () => this.service.getById(this.backupId()),
  });

  readonly backup = computed(() => this.backupResource.value());
  readonly isLoading = computed(() => this.backupResource.isLoading());
  readonly canDownload = computed(() => this.backup()?.status === 'COMPLETED');

  onDownload(): void {
    const backup = this.backup();
    if (!backup || backup.status !== 'COMPLETED') return;
    this.service.download(backup.id).then((blob) => {
      const filename = backup.objectKey
        ? backup.objectKey.split('/').pop()!
        : `backup-${backup.id}.dump`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    this.service.delete(this.backupId()).then(() => {
      this.router.navigate(['/backups']);
    });
  }

  onBack(): void {
    this.router.navigate(['/backups']);
  }

  formatSize(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return '\u2014';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
