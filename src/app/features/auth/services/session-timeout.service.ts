import { Injectable, inject, PLATFORM_ID, effect, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFeatureService } from './auth.service';
import { isPlatformBrowser } from '@angular/common';
import { fromEvent, Subject } from 'rxjs';
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
  private userActivity$ = new Subject<void>();
  private showWarning = false;
  private isRefreshing = false;
  private lastRefreshCheck = 0;
  private readonly REFRESH_THROTTLE_MS = 30_000; // Max 1 refresh check per 30s

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeActivityDetection();
      this.startInactivityMonitoring();
      
      // Complete destroy$ when service is destroyed
      this.destroyRef.onDestroy(() => {
        this.destroy$.next();
        this.destroy$.complete();
      });
    }
  }

  private initializeActivityDetection(): void {
    // Track user activity events
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    events.forEach(eventName => {
      fromEvent(document, eventName).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.onUserActivity();
      });
    });
  }

  private onUserActivity(): void {
    // Reset activity on any user interaction
    this.userActivity$.next();

    // Proactively refresh token if it's about to expire
    this.tryRefreshToken();

    // Hide warning if shown
    if (this.showWarning) {
      this.showWarning = false;
      this.removeWarningUI();
    }
  }

  private tryRefreshToken(): void {
    const now = Date.now();

    // Throttle: max 1 check every 30 seconds
    if (now - this.lastRefreshCheck < this.REFRESH_THROTTLE_MS) return;
    this.lastRefreshCheck = now;

    // Avoid duplicate concurrent refresh calls
    if (this.isRefreshing) return;

    const token = this.authService.token();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload?.exp;
      if (!exp) return;

      const expiresInMs = exp * 1000 - Date.now();
      if (expiresInMs > 0 && expiresInMs < this.REFRESH_BUFFER_MS) {
        // Token expires within 5 minutes — refresh silently
        this.isRefreshing = true;
        this.authService.refreshToken()
          .then(() => { this.lastRefreshCheck = Date.now(); })
          .catch(() => {
            // Refresh failed; guard will handle it on next route change
          })
          .finally(() => { this.isRefreshing = false; });
      }
    } catch {
      // Malformed token; ignore
    }
  }

  private startInactivityMonitoring(): void {
    // Monitor authentication state
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();
      
      if (isAuthenticated) {
        this.startInactivityTimer();
      } else {
        this.stopInactivityTimer();
      }
    });
  }

  private startInactivityTimer(): void {
    // Reset activity to start fresh timer
    this.userActivity$.next();

    // Warning timer
    this.userActivity$.pipe(
      debounceTime(this.TIMEOUT_MS - this.WARNING_MS),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.showWarning = true;
        this.showWarningUI();
      }
    });

    // Logout timer
    this.userActivity$.pipe(
      debounceTime(this.TIMEOUT_MS),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.handleSessionTimeout();
      }
    });
  }

  private stopInactivityTimer(): void {
    // Timer is automatically reset by userActivity$ on next activity
    this.showWarning = false;
    this.removeWarningUI();
  }

  private showWarningUI(): void {
    // Create warning modal
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
    `;

    warning.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="color: var(--accent-warning); font-size: 20px;">⚠️</div>
        <div>
          <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">
            Session Expiring Soon
          </div>
          <div style="color: var(--text-secondary); font-size: 14px;">
            Your session will expire in ${this.WARNING_SECONDS} seconds due to inactivity.
          </div>
        </div>
      </div>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(warning);
  }

  private removeWarningUI(): void {
    const warning = document.getElementById('session-warning');
    if (warning) {
      warning.remove();
    }
  }

  private async handleSessionTimeout(): Promise<void> {
    // Save current URL for redirect after login
    const currentUrl = this.router.url;
    if (currentUrl !== '/login') {
      localStorage.setItem('intended_url', currentUrl);
    }

    // Logout and redirect to login
    await this.authService.logout();
  }

  // Public method to manually reset timer (e.g., after API calls)
  resetTimer(): void {
    this.userActivity$.next();
  }

  // Get remaining time in seconds (for UI countdown if needed)
  getRemainingTime(): number {
    return this.WARNING_SECONDS;
  }
}
