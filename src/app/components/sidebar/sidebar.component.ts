import {
  Component,
  input,
  model,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { DrawerModule } from 'primeng/drawer';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthFeatureService } from '../../features/auth/services/auth.service';
import { ThemeService } from '../../features/auth/services/theme.service';
import { CompanyDataService } from '../../api/services/company-data.service';
import { CompanyDataResponse } from '../../api/models/company-data-response';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, FormsModule, DrawerModule, ToggleSwitchModule],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private router = inject(Router);
  private authService = inject(AuthFeatureService);
  private themeService = inject(ThemeService);
  private companyDataService = inject(CompanyDataService);

  // Two-way bound visibility so the parent can toggle the drawer menu.
  visible = model(false);

  companyData = signal<CompanyDataResponse | null>(null);
  companyName = computed(() => this.companyData()?.companyName ?? 'Project');

  constructor() {
    this.loadCompanyData();
  }

  private async loadCompanyData(): Promise<void> {
    try {
      const data = await this.companyDataService.companyDataControllerFindPublic();
      this.companyData.set(data);
    } catch (error) {
      console.error('Failed to load company data:', error);
    }
  }

  protected readonly user = this.authService.currentUser;

  menuItems = input<NavItem[]>([
    { icon: 'pi pi-home', label: 'Dashboard', route: '/dashboard' },
    { icon: 'pi pi-users', label: 'Users', route: '/users' },
    {
      icon: 'pi pi-inbox',
      label: 'Leads & Support',
      children: [
        { icon: 'pi pi-calendar', label: 'Appointments', route: '/appointments' },
        { icon: 'pi pi-envelope', label: 'Contact & Support', route: '/contact-support' },
      ],
    },
    {
      icon: 'pi pi-megaphone',
      label: 'Content & Marketing',
      children: [
        { icon: 'pi pi-tags', label: 'Blog Categories', route: '/blog-categories' },
        { icon: 'pi pi-file-edit', label: 'Posts', route: '/posts' },
        { icon: 'pi pi-share-alt', label: 'Social Media', route: '/social-media' },
        { icon: 'pi pi-video', label: 'Campaigns', route: '/campaigns' },
      ],
    },
    { icon: 'pi pi-building', label: 'Company Data', route: '/company-data' },
    {
      icon: 'pi pi-cog',
      label: 'Settings',
      children: [
        { icon: 'pi pi-shield', label: 'Roles', route: '/roles' },
        { icon: 'pi pi-database', label: 'Backups', route: '/backups' },
        { icon: 'pi pi-history', label: 'Activity Logs', route: '/activity-logs' },
      ],
    },
  ]);

  // Reactive current URL so active state works under zoneless change detection.
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  // Groups the user has manually toggled open.
  private readonly expandedGroups = signal<ReadonlySet<string>>(new Set());

  isActive(route?: string): boolean {
    if (!route) return false;
    const url = this.currentUrl();
    return url === route || url.startsWith(route + '/');
  }

  groupHasActive(item: NavItem): boolean {
    return !!item.children?.some((child) => this.isActive(child.route));
  }

  isGroupOpen(item: NavItem): boolean {
    return this.expandedGroups().has(item.label) || this.groupHasActive(item);
  }

  toggleGroup(label: string): void {
    this.expandedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  get userInitials(): string {
    const u = this.user();
    if (!u) return '?';
    const first = u.name?.charAt(0) ?? '';
    const last = u.lastName?.charAt(0) ?? '';
    return (first + last).toUpperCase() || u.email.charAt(0).toUpperCase();
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

  // Navigate WITHOUT pre-closing the drawer. Each page mounts its own
  // <app-sidebar>, so routing destroys this drawer while `visible` is still
  // true — which is exactly the condition PrimeNG's Drawer.onDestroy() requires
  // to remove its body-appended modal mask. Setting `visible=false` first would
  // make onDestroy() skip that cleanup, leaving the dim overlay stuck on screen.
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigate(route?: string): void {
    if (route) {
      this.router.navigate([route]);
    }
  }
}
