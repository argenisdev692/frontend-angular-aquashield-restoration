import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFeatureService } from './services/auth.service';
import { isPlatformServer } from '@angular/common';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthFeatureService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) {
    return true;
  }

  // If we already have a valid current user, allow immediately
  if (authService.currentUser()) {
    return true;
  }

  // Try to validate the stored session. If token expired (401),
  // fetchCurrentUser throws without wiping session — we try refresh first.
  try {
    await authService.fetchCurrentUser();
    return true;
  } catch {
    // Token may be expired — try silent refresh before forcing login.
    try {
      await authService.refreshToken();
      await authService.fetchCurrentUser();
      return true;
    } catch {
      // Refresh failed — clean session and redirect.
      await authService.logout(state.url);
      return false;
    }
  }
};
