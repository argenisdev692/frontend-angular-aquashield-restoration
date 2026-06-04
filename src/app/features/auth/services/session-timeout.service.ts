import { Injectable, inject, PLATFORM_ID, effect, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFeatureService } from './auth.service';
import { isPlatformBrowser } from '@angular/common';
import { fromEvent, Subject, Subscription } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
  private authService = inject(AuthFeatureService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  // Configuration
  private readonly TIMEOUT_MINUTES = 15; // 15 minutes of inactivity
  private readonly WARNING_SECONDS = 60; // Show warning 1 minute before timeout
  private readonly TIMEOUT_MS = this.TIMEOUT_MINUTES * 60 * 1000;
  private readonly WARNING_MS = this.WARNING_SECONDS * 1000;
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh if token expires within 5 min

  // State
  private destroy$ = new Subject<void>();
  private timerReset$ = new Subject<void>();
  private userActivity$ = new Subject<void>();
  private showWarning = false;
  private isRefreshing = false;
  private lastRefreshCheck = 0;
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private timerSubs: Subscription[] = [];
  private readonly REFRESH_THROTTLE_MS = 30_000; // Max 1 refresh check per 30s

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeActivityDetection();
      this.startInactivityMonitoring();

      // Complete subjects when service is destroyed
      this.destroyRef.onDestroy(() => {
        this.clearAll();
        this.destroy$.next();
        this.destroy$.complete();
        this.timerReset$.complete();
      });
    }
  }

  /** Clear all active timers and subscriptions. */
  private clearAll(): void {
    this.timerReset$.next();
    this.timerSubs.forEach((sub) => sub.unsubscribe());
    this.timerSubs = [];
    if (this.refreshIntervalId !== null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    this.showWarning = false;
    this.removeWarningUI();
  }

  private initializeActivityDetection(): void {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach((eventName) => {
      fromEvent(document, eventName)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.onUserActivity();
        });
    });
  }

  private onUserActivity(): void {
    this.userActivity$.next();
    this.tryRefreshToken();

    if (this.showWarning) {
      this.showWarning = false;
      this.removeWarningUI();
    }
  }

  /** Check if token is about to expire and refresh it (throttled). */
  private tryRefreshToken(): void {
    const now = Date.now();
    if (now - this.lastRefreshCheck < this.REFRESH_THROTTLE_MS) return;
    this.lastRefreshCheck = now;
    if (this.isRefreshing) return;

    const token = this.authService.token();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload?.exp;
      if (!exp) return;

      const expiresInMs = exp * 1000 - Date.now();
      if (expiresInMs > 0 && expiresInMs < this.REFRESH_BUFFER_MS) {
        this.isRefreshing = true;
        this.authService
          .refreshToken()
          .then(() => {
            this.lastRefreshCheck = Date.now();
          })
          .catch(() => {
            // Refresh failed; interceptor or guard will handle it on next request
          })
          .finally(() => {
            this.isRefreshing = false;
          });
      }
    } catch {
      // Malformed token; ignore
    }
  }

  /** Periodic check that runs every minute, even without user activity. */
  private startPeriodicTokenCheck(): void {
    if (this.refreshIntervalId !== null) return; // already running

    this.refreshIntervalId = setInterval(() => {
      this.tryRefreshToken();
    }, 60_000); // every 1 minute
  }

  private startInactivityMonitoring(): void {
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();

      if (isAuthenticated) {
        this.startInactivityTimer();
        this.startPeriodicTokenCheck();
      } else {
        this.clearAll();
      }
    });
  }

  private startInactivityTimer(): void {
    // Clear previous timers before creating new ones
    this.timerReset$.next();
    this.timerSubs.forEach((sub) => sub.unsubscribe());
    this.timerSubs = [];

    // Reset activity to start fresh
    this.userActivity$.next();

    // Warning timer (15 min - 1 min = 14 min of inactivity)
    const warningSub = this.userActivity$.pipe(
      debounceTime(this.TIMEOUT_MS - this.WARNING_MS),
      takeUntil(this.timerReset$)
    ).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.showWarning = true;
        this.showWarningUI();
      }
    });
    this.timerSubs.push(warningSub);

    // Logout timer (15 min of inactivity)
    const logoutSub = this.userActivity$.pipe(
      debounceTime(this.TIMEOUT_MS),
      takeUntil(this.timerReset$)
    ).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.handleSessionTimeout();
      }
    });
    this.timerSubs.push(logoutSub);
  }

  private showWarningUI(): void {
    const warning = document.createElement('div');
    warning.id = 'session-warning';
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--bg-elevated);
      border: 1px solid var(--accent-warning);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      z-index: 9999;
      box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
      animation: slideIn 0.3s ease;
      max-width: 360px;
    `;

    warning.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="color: var(--accent-warning); font-size: 20px;">⚠️</div>
        <div style="flex: 1;">
          <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">
            Session Expiring Soon
          </div>
          <div style="color: var(--text-secondary); font-size: 14px;">
            Your session will expire in ${this.WARNING_SECONDS} seconds due to inactivity.
            Click <strong>Stay Active</strong> to continue.
          </div>
          <button id="session-stay-active" style="
            margin-top: 12px;
            padding: 6px 16px;
            background: var(--accent-warning);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            font-weight: 600;
            cursor: pointer;
          ">Stay Active</button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(warning);

    // Bind stay-active button
    const btn = document.getElementById('session-stay-active');
    if (btn) {
      btn.addEventListener('click', () => {
        this.resetTimer();
      });
    }
  }

  private removeWarningUI(): void {
    const warning = document.getElementById('session-warning');
    if (warning) {
      warning.remove();
    }
  }

  private async handleSessionTimeout(): Promise<void> {
    const currentUrl = this.router.url;
    if (currentUrl !== '/login') {
      localStorage.setItem('intended_url', currentUrl);
    }
    await this.authService.logout(currentUrl !== '/login' ? currentUrl : undefined);
  }

  resetTimer(): void {
    this.userActivity$.next();
  }

  getRemainingTime(): number {
    return this.WARNING_SECONDS;
  }
}
