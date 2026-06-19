import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFeatureService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-user-menu',
  imports: [],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '(document:click)': 'close()',
    '(document:keydown.escape)': 'close()',
  },
})
export class UserMenuComponent {
  private authService = inject(AuthFeatureService);
  private router = inject(Router);

  protected readonly user = this.authService.currentUser;
  protected readonly open = signal(false);

  protected readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    const first = u.name?.charAt(0) ?? '';
    const last = u.lastName?.charAt(0) ?? '';
    return (first + last).toUpperCase() || (u.username?.charAt(0) ?? '').toUpperCase();
  });

  protected readonly primaryRole = computed(() => {
    const roles = this.user()?.roles;
    return roles && roles.length > 0 ? roles[0].name : 'User';
  });

  // Stop the trigger click from reaching the document listener (which would re-close it).
  toggle(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  goToProfile(): void {
    this.close();
    this.router.navigate(['/profile']);
  }

  async logout(): Promise<void> {
    this.close();
    await this.authService.logout();
  }
}
