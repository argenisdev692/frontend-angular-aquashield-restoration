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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

import { PostsFeatureService } from '../services/posts-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-posts-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, PageHeaderComponent, SidebarComponent],
  templateUrl: './posts-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './posts-detail.component.css',
})
export class PostsDetailComponent {
  private service = inject(PostsFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  readonly drawerVisible = signal(false);
  readonly postId = signal<string>(this.route.snapshot.params['id']);

  readonly postResource = resource({
    loader: () => this.service.getById(this.postId()),
  });

  readonly post = computed(() => this.postResource.value());
  readonly isLoading = computed(() => this.postResource.isLoading());

  /** Body is server-sanitized already; DOMPurify is a defense-in-depth pass. */
  readonly safeContent = computed<SafeHtml>(() => {
    const raw = this.post()?.postContent ?? '';
    const clean = DOMPurify.sanitize(raw);
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  });

  onEdit(): void {
    this.router.navigate(['/posts', this.postId(), 'edit']);
  }

  onDelete(): void {
    if (!confirm('Are you sure you want to delete this post?')) return;
    this.service.delete(this.postId()).then(() => {
      this.router.navigate(['/posts']);
    });
  }

  onRestore(): void {
    this.service.restore(this.postId()).then(() => this.postResource.reload());
  }

  onBack(): void {
    this.router.navigate(['/posts']);
  }

  isDeleted(): boolean {
    return this.post()?.deletedAt != null;
  }
}
