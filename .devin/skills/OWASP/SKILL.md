---
trigger: always_on
---

# OWASP Frontend Security Baseline — Angular 21 (2026)

> **Authority**: SINGLE SOURCE OF TRUTH for all frontend security decisions in Angular projects.
> **Sources**: OWASP Top 10:2025 (Web), OWASP ASVS v4.0.3, OWASP Secure Headers Project.
> **Scope**: Browser-side security, CSP, auth flows, XSS prevention, CSRF, secrets management, dependency security.
> **Remember**: The frontend is NOT a security boundary — the real enforcement is on the API server. These rules minimize attack surface and prevent client-side exploitation.

---

## 1. Cross-Site Scripting (XSS) Prevention

- **Angular auto-escapes by default** — NEVER bypass with `DomSanitizer.bypassSecurityTrust` unless absolutely necessary.
- If bypassing security is required, ALWAYS sanitize with DOMPurify first.
- NEVER render user input inside `[innerHTML]` without sanitization.
- NEVER use `document.write()`, `innerHTML`, or `outerHTML` with user-controlled data.
- NEVER construct URLs from user input without validation — use `URL` constructor + allowlist.
- Use Angular's built-in sanitization via `DomSanitizer`.

```typescript
// ✅ CORRECT — sanitized HTML
import { DomSanitizer } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

constructor(private sanitizer: DomSanitizer) {}

getSafeHtml(html: string) {
  const clean = DOMPurify.sanitize(html);
  return this.sanitizer.bypassSecurityTrustHtml(clean);
}

// ❌ FORBIDDEN — raw user HTML
this.sanitizer.bypassSecurityTrustHtml(userInput);
```

---

## 2. Content Security Policy (CSP)

EVERY production Angular app MUST have a Content Security Policy. Configure in `angular.json` or via interceptors:

```typescript
// security.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';

@Injectable()
export class SecurityHeadersInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const secureReq = req.clone({
      setHeaders: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; connect-src 'self' wss:; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests;",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
      }
    });
    return next.handle(secureReq);
  }
}
```

---

## 3. Authentication & Session Security

- Use **HttpOnly, Secure, SameSite=Lax** cookies for tokens — NEVER in `localStorage` or `sessionStorage`.
- NEVER store JWT in localStorage — use HttpOnly cookies or in-memory service singleton.
- Session validation happens in functional interceptors — attach tokens automatically.
- NEVER expose access tokens to templates — read via services only.
- NEVER trust client-side permission checks as security — they are UX hints only. The API enforces real authorization.
- Password reset tokens MUST be single-use and time-limited.
- ALWAYS return HTTP 200 for password reset requests regardless of email existence — prevent user enumeration.

```typescript
// ✅ CORRECT — HttpOnly cookie via interceptor
export function authInterceptor(): HttpInterceptorFn {
  return (req, next) => {
    const token = inject(AuthService).getToken();
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
    return next(req);
  };
}

// ❌ FORBIDDEN — localStorage token storage
localStorage.setItem('token', response.accessToken);
```

---

## 4. Cross-Site Request Forgery (CSRF)

- Use Angular's built-in CSRF protection via `HttpClientXsrfModule`.
- Configure CSRF token in `app.config.ts` with `withCsrfProtection()`.
- Set cookies with `SameSite=Lax` (or `Strict` for sensitive actions) — NEVER `SameSite=None` without necessity.
- NEVER use GET requests for state mutations — always POST/PATCH/PUT/DELETE.

```typescript
// app.config.ts
provideHttpClient(
  withInterceptors([authInterceptor]),
  withCsrfProtection({
    cookieName: 'XSRF-TOKEN',
    headerName: 'X-XSRF-TOKEN'
  })
)
```

---

## 5. Environment Variables & Secrets

- **Server-only secrets** (DB URLs, API keys): use environment files — accessible ONLY in build time.
- **Client-exposed values** (API base URL): use standard env vars — these are embedded in the client bundle.
- Validate ALL environment variables at startup with Zod in `env.ts`.
- NEVER commit `.env.local` — add to `.gitignore`. Provide `.env.example` with placeholder values.

```typescript
// env.ts
import { z } from 'zod';

const envSchema = z.object({
  API_URL: z.string().url(),
  WS_URL: z.string().url(),
});

export const env = envSchema.parse({
  API_URL: environment.apiUrl,
  WS_URL: environment.wsUrl,
});
```

---

## 6. Open Redirect Prevention

- NEVER redirect to user-supplied URLs without validation.
- Use Angular Router with hardcoded paths — NEVER with user input directly.
- If dynamic redirect is needed, validate against an allowlist of internal paths.

```typescript
// ✅ CORRECT — allowlisted redirect
const ALLOWED_REDIRECTS = new Set(['/dashboard', '/profile', '/settings']);
const target = redirectUrl ?? '/dashboard';
const safeTarget = ALLOWED_REDIRECTS.has(target) ? target : '/dashboard';
this.router.navigate([safeTarget]);

// ❌ FORBIDDEN — open redirect
this.router.navigate([userProvidedUrl]);
```

---

## 7. Dependency Security

- Pin all dependencies in `package.json` — use exact versions or lockfile.
- Run `npm audit` in CI on every PR — block merges on critical/high vulnerabilities.
- NEVER install packages from untrusted sources or with `--ignore-scripts` in production.
- Keep Angular >= 21.0 — stay updated with latest security patches.
- Review changelogs before upgrading major versions.

---

## 8. Information Disclosure Prevention

- NEVER expose stack traces, internal error messages, or server paths to the client.
- Global error handler MUST show user-friendly messages — NEVER `error.stack` or `error.message` from server.
- NEVER log sensitive data (`tokens`, `passwords`, `cookies`, `headers`) in browser console.
- Remove `X-Powered-By` header — configure in interceptor.

```typescript
// global-error-handler.ts
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error): void {
    // ✅ CORRECT — generic message to user
    this.notificationService.showError('Something went wrong');
    
    // ❌ FORBIDDEN — leaking server info
    console.error(error.stack);
  }
}
```

---

## 9. Secure Data Fetching

- Functional interceptors MUST attach auth tokens automatically — NEVER pass tokens manually.
- NEVER fetch from arbitrary URLs constructed from user input — SSRF via the browser.
- Validate ALL API response shapes with Zod before using data — don't trust the API blindly.
- Set timeouts on all HTTP requests — NEVER allow infinite waits.
- NEVER log request/response bodies containing sensitive data.

```typescript
// service with validation
@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  
  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products').pipe(
      map(data => productSchema.array().parse(data))
    );
  }
}
```

---

## 10. Image & File Upload Security

- Validate file type, size, and dimensions on the client AND server.
- Use `NgOptimizedImage` for static images — NEVER arbitrary image loading.
- Set allowlist for image domains in CSP.
- Validate file uploads before sending to server.

---

## 11. Rate Limiting & Abuse Prevention

- Rate limit auth endpoints (login, register) — implement on the API server, but also add client-side debounce.
- Debounce search inputs to avoid flooding the API.
- Disable submit buttons during `isLoading` state — prevent double submissions.
- Use confirmation dialogs before every destructive action (delete, suspend, revoke).

---

## 12. WebSocket Security

- Authenticate WebSocket connections during handshake — NEVER allow unauthenticated WS connections.
- Validate all incoming WS event payloads — NEVER trust data from the server blindly.
- Use `wss://` (TLS) in production — NEVER plain `ws://`.
- Reconnect with exponential backoff — NEVER infinite immediate retries.

---

## 13. Functional Interceptors Security

- Functional interceptors handle auth automatically.
- ALWAYS validate tokens in interceptor before attaching.
- NEVER expose internal error details in interceptor responses.
- Handle CSRF tokens via `withCsrfProtection()`.

---

## 14. Third-Party Script Security

- Load third-party scripts via Angular's built-in mechanisms — NEVER inline `<script>` tags.
- Pin script versions — NEVER load `latest` from CDN.
- Add third-party domains to CSP `script-src` explicitly — NEVER use `'unsafe-inline'` in production.
- Audit third-party scripts regularly for supply chain attacks.

---

## Repository Enforcement Rules

- Always validate inputs with Zod — on Reactive Forms AND API calls.
- Always set CSP + security headers via interceptors.
- Always store tokens in httpOnly cookies — NEVER localStorage.
- Always sanitize before `[innerHTML]` — use DOMPurify + DomSanitizer.
- Always validate env vars at startup with Zod.
- Always redirect with allowlisted paths — NEVER user-supplied URLs directly.
- Always keep Angular updated to latest version.
- Always verify auth in interceptors — automatic token attachment.
- Always use `NgOptimizedImage` for images.
- Always show user-friendly errors — NEVER expose stack traces or server internals.
