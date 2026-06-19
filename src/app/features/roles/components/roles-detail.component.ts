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
import { TableModule } from 'primeng/table';

import { RolesFeatureService } from '../services/roles-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-roles-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ButtonModule,
    TableModule,
    PageHeaderComponent,
    SidebarComponent,
  ],
  templateUrl: './roles-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './roles-detail.component.css',
})
export class RolesDetailComponent {
  private service = inject(RolesFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly drawerVisible = signal(false);
  readonly roleId = signal<string>(this.route.snapshot.params['id']);

  readonly roleResource = resource({
    loader: () => this.service.getById(this.roleId()),
  });

  readonly role = computed(() => this.roleResource.value());
  readonly isLoading = computed(() => this.roleResource.isLoading());

  readonly permissionColumns = [
    { field: 'name', header: 'Name' },
    { field: 'module', header: 'Module' },
    { field: 'subject', header: 'Subject' },
    { field: 'action', header: 'Action' },
  ];

  onEdit(): void {
    this.router.navigate(['/roles', this.roleId(), 'edit']);
  }

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this role?')) return;
    this.service.delete(this.roleId()).then(() => {
      this.router.navigate(['/roles']);
    });
  }

  onRestore(): void {
    this.service.restore(this.roleId()).then(() => {
      this.roleResource.reload();
    });
  }

  onBack(): void {
    this.router.navigate(['/roles']);
  }

  isDeleted(): boolean {
    return this.role()?.deletedAt !== null;
  }

  isSystem(): boolean {
    return this.role()?.isSystem === true;
  }
}
