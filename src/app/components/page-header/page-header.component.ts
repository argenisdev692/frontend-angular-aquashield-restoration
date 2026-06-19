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
import { ButtonModule } from 'primeng/button';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { AnimatedButtonComponent } from '../animated-button/animated-button.component';
import { ThemeService } from '../../features/auth/services/theme.service';

interface NotificationItem {
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

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
  // White logo on the dark theme, full-color logo on the light theme.
  protected readonly isDark = computed(() => this.themeService.mode() === 'dark');

  notificationsOpen = signal(false);
  messagesOpen = signal(false);
  inboxOpen = signal(false);
  searchOpen = signal(false);
  searchQuery = signal('');

  readonly searchInputRef = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  notifications = signal<NotificationItem[]>([
    {
      title: 'New claim assigned',
      message: 'Claim #2342 has been assigned to you',
      time: '2 min ago',
      unread: true,
    },
    {
      title: 'Payment received',
      message: '$12,500 from ABC Corp',
      time: '1 hour ago',
      unread: true,
    },
    {
      title: 'System update',
      message: 'Dashboard v2.1 is now live',
      time: '3 hours ago',
      unread: false,
    },
  ]);

  messages = signal<NotificationItem[]>([
    {
      title: 'Sarah Johnson',
      message: 'Can we reschedule the meeting?',
      time: '10 min ago',
      unread: true,
    },
    {
      title: 'Mike Chen',
      message: 'The report is ready for review',
      time: '45 min ago',
      unread: true,
    },
    {
      title: 'Support Team',
      message: 'Your ticket #8921 is resolved',
      time: '2 hours ago',
      unread: false,
    },
  ]);

  inbox = signal<NotificationItem[]>([
    {
      title: 'Invoice #4451',
      message: 'New invoice from AquaSupply Inc',
      time: '30 min ago',
      unread: true,
    },
    {
      title: 'Contract renewal',
      message: 'Annual contract expires in 7 days',
      time: '1 day ago',
      unread: false,
    },
  ]);

  unreadCount(items: NotificationItem[]): number {
    return items.filter((i) => i.unread).length;
  }

  toggleDropdown(type: 'notifications' | 'messages' | 'inbox', event: Event): void {
    event.stopPropagation();
    this.notificationsOpen.set(type === 'notifications' ? !this.notificationsOpen() : false);
    this.messagesOpen.set(type === 'messages' ? !this.messagesOpen() : false);
    this.inboxOpen.set(type === 'inbox' ? !this.inboxOpen() : false);
  }

  closeDropdowns(): void {
    this.notificationsOpen.set(false);
    this.messagesOpen.set(false);
    this.inboxOpen.set(false);
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
