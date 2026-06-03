import { Component, input, model, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MenuItem } from 'primeng/api';
import { AuthFeatureService } from '../../features/auth/services/auth.service';
import { ThemeService } from '../../features/auth/services/theme.service';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  active: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, FormsModule, DrawerModule, MenuModule, ToggleSwitchModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private router = inject(Router);
  private authService = inject(AuthFeatureService);
  private themeService = inject(ThemeService);

  // Two-way bound visibility so the parent can toggle the drawer menu.
  visible = model(false);

  companyName = input('Aquashield Restoration LLC');

  protected readonly user = this.authService.currentUser;

  menuItems = input<NavItem[]>([
    { icon: 'pi pi-home', label: 'Dashboard', route: '/dashboard', active: true },
    { icon: 'pi pi-chart-line', label: 'Analytics', route: '/analytics', active: false },
    { icon: 'pi pi-users', label: 'Users', route: '/users', active: false },
    { icon: 'pi pi-briefcase', label: 'Projects', route: '/projects', active: false },
    { icon: 'pi pi-cog', label: 'Settings', route: '/settings', active: false },
  ]);

  menuModel = computed<MenuItem[]>(() => this.menuItems() as unknown as MenuItem[]);

  getMenuItemClasses(active: boolean): string {
    return `menu-item ${active ? 'active' : ''}`;
  }

  get userInitials(): string {
    const u = this.user();
    if (!u) return '?';
    const first = u.name?.charAt(0) ?? '';
    const last = u.lastName?.charAt(0) ?? '';
    return (first + last).toUpperCase() || u.username.charAt(0).toUpperCase();
  }

  get primaryRole(): string {
    const roles = this.user()?.roles;
    return roles && roles.length > 0 ? roles[0].name : 'User';
  }

  // Theme toggle: p-toggleswitch checked means "dark mode on"
  protected readonly isDark = computed(() => this.themeService.mode() === 'dark');

  protected onThemeToggle(checked: boolean): void {
    this.themeService.set(checked ? 'dark' : 'light');
  }

  goToProfile(): void {
    this.visible.set(false);
    this.router.navigate(['/profile']);
  }

  navigate(route?: string): void {
    if (route) {
      this.visible.set(false);
      this.router.navigate([route]);
    }
  }
}
