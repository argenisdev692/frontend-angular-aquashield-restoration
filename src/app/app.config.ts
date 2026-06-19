import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideApiConfiguration } from './api/api-configuration';
import { authInterceptor } from './api/interceptors/auth.interceptor';

// Typed, `any`-free access to build-time env (NG_APP_* are embedded in the client bundle)
const buildEnv =
  typeof import.meta !== 'undefined'
    ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    : undefined;

const apiBaseUrl =
  buildEnv?.['NG_APP_API_BASE_URL'] ??
  'https://backend-aquashield-restoration-production.up.railway.app';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideZonelessChangeDetection(),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
          cssLayer: { name: 'primeng', order: 'primeng' },
        },
      },
    }),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideApiConfiguration(apiBaseUrl),
  ],
};
