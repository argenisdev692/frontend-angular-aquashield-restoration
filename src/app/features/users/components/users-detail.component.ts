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
import { TagModule } from 'primeng/tag';

import { UsersFeatureService } from '../services/users-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-users-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, TagModule, PageHeaderComponent, SidebarComponent],
  templateUrl: './users-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './users-detail.component.css',
})
export class UsersDetailComponent {
  private service = inject(UsersFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly drawerVisible = signal(false);
  readonly userId = signal<string>(this.route.snapshot.params['id']);

  readonly userResource = resource({
    loader: () => this.service.getById(this.userId()),
  });

  readonly user = computed(() => this.userResource.value());
  readonly isLoading = computed(() => this.userResource.isLoading());

  onEdit(): void {
    this.router.navigate(['/users', this.userId(), 'edit']);
  }

  onManagePermissions(): void {
    this.router.navigate(['/users', this.userId(), 'permissions']);
  }

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this user?')) return;
    this.service.delete(this.userId()).then(() => {
      this.router.navigate(['/users']);
    });
  }

  onBack(): void {
    this.router.navigate(['/users']);
  }

  getRoleNames(): string {
    return (
      this.user()
        ?.roles.map((r) => r.name)
        .join(', ') ?? 'None'
    );
  }

  getPermissionNames(): string {
    return (
      this.user()
        ?.permissions.map((p) => `${p.subject}:${p.action}`)
        .join(', ') ?? 'None'
    );
  }

  isSuspended(): boolean {
    return this.user()?.deletedAt !== null;
  }
}
