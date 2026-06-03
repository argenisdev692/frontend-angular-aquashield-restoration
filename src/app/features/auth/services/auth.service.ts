import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../../api/api-configuration';
import { AuthService as GeneratedAuthService } from '../../../api/services/auth.service';
import { LoginDto } from '../../../api/models';
import { VerifyTwoFactorChallengeDto } from '../../../api/models/verify-two-factor-challenge-dto';
import { UserResponse } from '../../../api/models/user-response';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthFeatureService {
  private generatedAuthService = inject(GeneratedAuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private config = inject(ApiConfiguration);
  private tokenStorage = inject(TokenStorageService);

  // Authentication state signals
  private _isAuthenticated = signal<boolean>(false);
  private _currentUser = signal<UserResponse | null>(null);
  private _isInitialized = signal<boolean>(false);

  // Public readonly signals
  isAuthenticated = this._isAuthenticated.asReadonly();
  currentUser = this._currentUser.asReadonly();
  token = this.tokenStorage.accessToken;

  constructor() {
    this.loadAuthState();
    this._isInitialized.set(true);
  }

  public loadAuthState(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedAccessToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken) {
      this.tokenStorage.setAccessToken(storedAccessToken);
      // Only mark as authenticated if token is not expired
      if (!this.isTokenExpired(storedAccessToken)) {
        this._isAuthenticated.set(true);
        if (storedUser) {
          this._currentUser.set(JSON.parse(storedUser) as UserResponse);
        }
      }
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload?.exp;
      if (!exp) return false; // no expiry claim, treat as valid
      return Date.now() >= exp * 1000;
    } catch {
      return true; // malformed token = expired
    }
  }

  async login(credentials: LoginDto, returnUrl?: string): Promise<{
    accessToken?: string;
    accessTokenExpiresAt?: string;
    refreshToken?: string;
    twoFactorRequired?: boolean;
    mustChangePassword?: boolean;
    passwordExpiresAt?: string | null;
  }> {
    const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
    const loginUrl = `${rootUrl}/api/v1/auth/login`;

    const loginResponse = await firstValueFrom(
      this.http.post<{
        accessToken: string;
        accessTokenExpiresAt: string;
        refreshToken: string;
        twoFactorRequired: boolean;
        mustChangePassword: boolean;
        passwordExpiresAt: string | null;
      }>(loginUrl, credentials)
    );

    if (loginResponse.twoFactorRequired) {
      return loginResponse;
    }

    if (!loginResponse?.accessToken) {
      throw new Error('Login response did not contain accessToken');
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('refresh_token', loginResponse.refreshToken);
      localStorage.setItem('access_token', loginResponse.accessToken);
      localStorage.setItem('is_authenticated', 'true');
    }

    this.tokenStorage.setAccessToken(loginResponse.accessToken);
    this._isAuthenticated.set(true);

    // Populate currentUser before navigation so authGuard sees it immediately (important in zoneless + signals)
    await this.fetchCurrentUser().catch(() => {
      // Still allow the caller to decide navigation even if /me fails
    });

    // Note: actual navigation is performed by the caller (login-form) after showing 'Redirecting...' message
    // to ensure the transient success banner is visible to the user.

    return loginResponse;
  }

  async verifyTwoFactor(challenge: VerifyTwoFactorChallengeDto, returnUrl?: string): Promise<void> {
    const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
    const url = `${rootUrl}/api/v1/auth/two-factor/verify`;

    const response = await firstValueFrom(
      this.http.post<{
        accessToken: string;
        accessTokenExpiresAt: string;
        refreshToken: string;
      }>(url, challenge)
    );

    if (!response?.accessToken) {
      throw new Error('2FA verification did not return accessToken');
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('refresh_token', response.refreshToken);
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('is_authenticated', 'true');
    }

    this.tokenStorage.setAccessToken(response.accessToken);
    this._isAuthenticated.set(true);

    // Populate currentUser BEFORE navigation (critical for authGuard + zoneless signals)
    await this.fetchCurrentUser().catch(() => {});

    let redirectUrl = returnUrl;
    if (!redirectUrl && isPlatformBrowser(this.platformId)) {
      redirectUrl = localStorage.getItem('intended_url') ?? undefined;
      localStorage.removeItem('intended_url');
    }

    await this.router.navigate([redirectUrl || '/dashboard']);
  }

  googleSignIn(): void {
    const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
    window.location.href = `${rootUrl}/api/v1/auth/google/redirect`;
  }

  async forgotPassword(email: string): Promise<void> {
    const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
    await firstValueFrom(
      this.http.post(`${rootUrl}/api/v1/auth/forgot-password`, { email })
    );
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
    await firstValueFrom(
      this.http.post(`${rootUrl}/api/v1/auth/reset-password`, { email, code, newPassword })
    );
  }

  /**
   * Send a one-time login code to the user's email.
   * Backend endpoint required: POST /api/v1/auth/otp/send
   */
  async sendEmailOtp(email: string): Promise<void> {
    const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
    await firstValueFrom(
      this.http.post(`${rootUrl}/api/v1/auth/otp/send`, { email })
    );
  }

  /**
   * Verify email OTP code and complete login.
   * Backend endpoint required: POST /api/v1/auth/otp/verify
   */
  async verifyEmailOtp(email: string, code: string, returnUrl?: string): Promise<void> {
    const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
    const response = await firstValueFrom(
      this.http.post<{
        accessToken: string;
        accessTokenExpiresAt: string;
        refreshToken: string;
      }>(`${rootUrl}/api/v1/auth/otp/verify`, { email, code })
    );

    if (!response?.accessToken) {
      throw new Error('OTP verification did not return accessToken');
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('refresh_token', response.refreshToken);
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('is_authenticated', 'true');
    }

    this.tokenStorage.setAccessToken(response.accessToken);
    this._isAuthenticated.set(true);

    // Populate currentUser before caller decides to navigate (zoneless + authGuard safety)
    await this.fetchCurrentUser().catch(() => {});

    // Navigation intentionally left to the caller (login-form) so the 'Redirecting...' banner is visible.
  }

  /**
   * Login directly with TOTP code (primary method).
   * Backend endpoint required: POST /api/v1/auth/totp/login
   */
  async loginWithTotp(email: string, code: string, returnUrl?: string): Promise<void> {
    const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
    const response = await firstValueFrom(
      this.http.post<{
        accessToken: string;
        accessTokenExpiresAt: string;
        refreshToken: string;
      }>(`${rootUrl}/api/v1/auth/totp/login`, { email, code })
    );

    if (!response?.accessToken) {
      throw new Error('TOTP login did not return accessToken');
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('refresh_token', response.refreshToken);
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('is_authenticated', 'true');
    }

    this.tokenStorage.setAccessToken(response.accessToken);
    this._isAuthenticated.set(true);

    // Populate currentUser before caller decides to navigate (zoneless + authGuard safety)
    await this.fetchCurrentUser().catch(() => {});

    // Navigation intentionally left to the caller (login-form) so the 'Redirecting...' banner is visible.
  }

  async logout(): Promise<void> {
    try {
      await this.generatedAuthService.authControllerLogout();
    } catch {
      // Ignore logout API errors
    } finally {
      this._isAuthenticated.set(false);
      this._currentUser.set(null);
      this.tokenStorage.setAccessToken(null);

      if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('is_authenticated');
        localStorage.removeItem('user');
      }

      await this.router.navigate(['/login']);
    }
  }

  async fetchCurrentUser(): Promise<void> {
    try {
      const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
      const meUrl = `${rootUrl}/api/v1/auth/me`;

      const user = await firstValueFrom(this.http.get<UserResponse>(meUrl));

      this._currentUser.set(user);
      this._isAuthenticated.set(true);

      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('is_authenticated', 'true');
      }
    } catch (err: any) {
      // Don't auto-logout here — caller (authGuard) will try refreshToken first.
      // logout() wipes refresh_token from localStorage, making refresh impossible.
      throw err;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const refreshToken = isPlatformBrowser(this.platformId)
        ? localStorage.getItem('refresh_token')
        : null;

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
      const refreshUrl = `${rootUrl}/api/v1/auth/refresh`;

      const refreshResponse = await firstValueFrom(
        this.http.post<{
          accessToken: string;
          accessTokenExpiresAt: string;
          refreshToken: string;
        }>(refreshUrl, { refreshToken })
      );

      if (refreshResponse?.accessToken) {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('refresh_token', refreshResponse.refreshToken);
        }
        this.tokenStorage.setAccessToken(refreshResponse.accessToken);
      }
    } catch (err: any) {
      // Only logout on 401 Unauthorized. Network/server errors should not wipe session.
      if (err?.status === 401) {
        await this.logout();
      }
      throw err;
    }
  }
}
