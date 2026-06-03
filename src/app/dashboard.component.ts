import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { DashboardCardComponent } from './components/dashboard-card/dashboard-card.component';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
import { FloatingMenuButtonComponent } from './components/floating-menu-button/floating-menu-button.component';
import { AuthService } from './api/services/auth.service';
import { UserResponse } from './api/models/user-response';
import { CompanyDataService } from './api/services/company-data.service';
import { CompanyDataResponse } from './api/models/company-data-response';

@Component({
  selector: 'app-dashboard',
  imports: [SidebarComponent, PageHeaderComponent, DashboardCardComponent, KanbanBoardComponent, FloatingMenuButtonComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private companyDataService = inject(CompanyDataService);

  // Controls the PrimeNG drawer menu visibility.
  protected readonly drawerVisible = signal(false);

  // User data from /me endpoint
  protected readonly user = signal<UserResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  // Company data from public endpoint
  protected readonly companyData = signal<CompanyDataResponse | null>(null);
  protected readonly companyName = computed(() => this.companyData()?.companyName ?? 'Aquashield Restoration LLC');
  protected readonly companyTaxId = computed(() => this.companyData()?.taxId ?? '');

  protected readonly headerSubtitle = computed(() => {
    if (this.loading()) return 'Loading...';
    if (this.error()) return 'Error loading user data';
    if (this.user()) return `Welcome back, ${this.user()?.name} ${this.user()?.lastName}`;
    return '';
  });

  ngOnInit(): void {
    this.loadUserData();
    this.loadCompanyData();
  }

  private async loadUserData(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      const userData = await this.authService.authControllerMe();
      this.user.set(userData);
    } catch {
      this.error.set('Failed to load user data');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCompanyData(): Promise<void> {
    try {
      const data = await this.companyDataService.companyDataControllerFindPublic();
      this.companyData.set(data);
    } catch {
      /* silently fail, fallback to hardcoded */
    }
  }
}
