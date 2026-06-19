import {
  Component,
  AfterViewInit,
  OnInit,
  ElementRef,
  viewChild,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { GradientBackgroundComponent } from './components/gradient-background/gradient-background.component';
import { NotificationOutletComponent } from './shared/notifications/notification-outlet.component';
import { SessionTimeoutService } from './features/auth/services/session-timeout.service';
import { AuthFeatureService } from './features/auth/services/auth.service';
import { ThemeService } from './features/auth/services/theme.service';
import { CompanyDataService } from './api/services/company-data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GradientBackgroundComponent, NotificationOutletComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit {
  protected readonly title = 'Aquashield Restoration LLC Dashboard';

  private cursorOrb = viewChild.required<ElementRef<HTMLDivElement>>('cursorOrb');
  private platformId = inject(PLATFORM_ID);

  // Initialize auth service early to ensure localStorage state is loaded
  private authService = inject(AuthFeatureService);
  // Initialize session timeout service
  private sessionTimeoutService = inject(SessionTimeoutService);
  // Initialize theme service early (applies .dark + data-theme from localStorage)
  private themeService = inject(ThemeService);
  private companyDataService = inject(CompanyDataService);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.companyDataService
        .companyDataControllerFindPublic()
        .then((data) => {
          if (data?.companyName) {
            document.title = data.companyName;
          }
        })
        .catch(() => {
          /* silently fail, keep default title */
        });
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('mousemove', (e: MouseEvent) => {
        const orb = this.cursorOrb();
        if (orb) {
          orb.nativeElement.style.left = e.clientX + 'px';
          orb.nativeElement.style.top = e.clientY + 'px';
        }
      });
    }
  }
}
