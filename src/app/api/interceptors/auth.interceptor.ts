import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { ApiConfiguration } from '../api-configuration';
import { TokenStorageService } from '../../features/auth/services/token-storage.service';
import { AuthFeatureService } from '../../features/auth/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const tokenStorage = inject(TokenStorageService);
  const config = inject(ApiConfiguration);
  const injector = inject(Injector);
  const router = inject(Router);

  const token = tokenStorage.getAccessToken();
  const rootUrl = (config.rootUrl || '').replace(/\/$/, '');

  const isApiRequest = rootUrl
    ? req.url.startsWith(rootUrl)
    : req.url.includes('backend-aquashield-restoration-production.up.railway.app');

  // Don't attach expired access token to auth endpoints — backend may reject it
  const isAuthEndpoint =
    req.url.endsWith('/api/v1/auth/login') ||
    req.url.endsWith('/api/v1/auth/refresh') ||
    req.url.endsWith('/api/v1/auth/logout') ||
    req.url.endsWith('/api/v1/auth/me') ||
    req.url.endsWith('/api/v1/auth/otp/send') ||
    req.url.endsWith('/api/v1/auth/otp/verify') ||
    req.url.endsWith('/api/v1/auth/two-factor/verify') ||
    req.url.endsWith('/api/v1/auth/totp/login') ||
    req.url.includes('/api/v1/auth/forgot-password') ||
    req.url.includes('/api/v1/auth/reset-password');

  let outgoingReq = req;
  if (token && isApiRequest && !isAuthEndpoint) {
    outgoingReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(outgoingReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiRequest && !isAuthEndpoint) {
        // Lazy-resolve AuthFeatureService via Injector to avoid circular dependency
        const authService = injector.get(AuthFeatureService);
        return from(authService.refreshToken()).pipe(
          switchMap(() => {
            const newToken = tokenStorage.getAccessToken();
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` }
            });
            return next(retryReq);
          }),
          catchError(() => {
            const currentUrl = router.url;
            if (currentUrl !== '/login') {
              localStorage.setItem('intended_url', currentUrl);
            }
            authService.logout();
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
