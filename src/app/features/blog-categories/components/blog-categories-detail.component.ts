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

import { BlogCategoriesFeatureService } from '../services/blog-categories-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-blog-categories-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, PageHeaderComponent, SidebarComponent],
  templateUrl: './blog-categories-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './blog-categories-detail.component.css',
})
export class BlogCategoriesDetailComponent {
  private service = inject(BlogCategoriesFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly drawerVisible = signal(false);
  readonly categoryId = signal<string>(this.route.snapshot.params['id']);

  readonly categoryResource = resource({
    loader: () => this.service.getById(this.categoryId()),
  });

  readonly category = computed(() => this.categoryResource.value());
  readonly isLoading = computed(() => this.categoryResource.isLoading());

  onEdit(): void {
    this.router.navigate(['/blog-categories', this.categoryId(), 'edit']);
  }

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this category?')) return;
    this.service.delete(this.categoryId()).then(() => {
      this.router.navigate(['/blog-categories']);
    });
  }

  onRestore(): void {
    this.service.restore(this.categoryId()).then(() => {
      this.categoryResource.reload();
    });
  }

  onBack(): void {
    this.router.navigate(['/blog-categories']);
  }

  isDeleted(): boolean {
    return this.category()?.deletedAt !== null;
  }
}
