import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { AnimatedButtonComponent } from '../animated-button/animated-button.component';
import { ThemeService } from '../../features/auth/services/theme.service';
import { HeaderNotificationsService } from '../../shared/header-notifications/header-notifications.service';
import {
  HeaderNotification,
  HeaderNotificationFeed,
} from '../../shared/header-notifications/header-notifications.types';

type DropdownKey = 'appointments' | 'contact' | 'retell';

@Component({
  selector: 'app-page-header',
  imports: [CommonModule, ButtonModule, UserMenuComponent, AnimatedButtonComponent],
  templateUrl: './page-header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './page-header.component.css',
})
export class PageHeaderComponent implements OnInit {
  title = input.required<string>();
  subtitle = input<string>('');
  companyName = input<string>('');
  showNewClaim = input<boolean>(false);

  menuToggle = output<void>();

  private themeService = inject(ThemeService);
  private router = inject(Router);
  protected readonly notifications = inject(HeaderNotificationsService);

  // White logo on the dark theme, full-color logo on the light theme.
  protected readonly isDark = computed(() => this.themeService.mode() === 'dark');

  appointmentsOpen = signal(false);
  contactOpen = signal(false);
  retellOpen = signal(false);
  searchOpen = signal(false);
  searchQuery = signal('');

  readonly searchInputRef = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  toggleDropdown(type: DropdownKey, event: Event): void {
    event.stopPropagation();
    this.appointmentsOpen.set(type === 'appointments' ? !this.appointmentsOpen() : false);
    this.contactOpen.set(type === 'contact' ? !this.contactOpen() : false);
    this.retellOpen.set(type === 'retell' ? !this.retellOpen() : false);
  }

  closeDropdowns(): void {
    this.appointmentsOpen.set(false);
    this.contactOpen.set(false);
    this.retellOpen.set(false);
  }

  /** Mark the item read and open its detail page. */
  openItem(feed: HeaderNotificationFeed, item: HeaderNotification): void {
    this.closeDropdowns();
    void this.notifications.markRead(feed, item.id);
    void this.router.navigateByUrl(item.routerLink);
  }

  viewAll(path: string): void {
    this.closeDropdowns();
    void this.router.navigateByUrl(path);
  }

  openSearch(): void {
    this.closeDropdowns();
    this.searchOpen.set(true);
    // Focus input on next tick
    requestAnimationFrame(() => this.searchInputRef().nativeElement.focus());
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  ngOnInit(): void {
    this.notifications.start();
    if (typeof document !== 'undefined') {
      document.addEventListener('click', () => this.closeDropdowns());
    }
  }

  onMenuClick(): void {
    this.menuToggle.emit();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeSearch();
    }
  }
}
