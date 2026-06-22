import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

/** How many times to retry a rate-limited (429) request before giving up. */
const MAX_RETRIES = 3;
/** Base delay for the exponential backoff (doubles each attempt). */
const BASE_DELAY_MS = 800;
/** Cap a single backoff wait so a hostile `Retry-After` can't hang the UI. */
const MAX_DELAY_MS = 8_000;

/**
 * Transparently retries HTTP `429 Too Many Requests` responses with exponential
 * backoff + jitter, honoring the server's `Retry-After` header when present.
 *
 * The appointments calendar bursts requests on load (paging through every
 * appointment + one availability calendar per visible month), which can trip the
 * backend rate limiter. Rather than surfacing a transient 429 as an error toast,
 * we wait and retry; only a persistent failure (after {@link MAX_RETRIES})
 * propagates to the caller. Non-429 errors pass straight through untouched so the
 * auth interceptor's 401 refresh-retry still runs.
 */
export const rateLimitInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, retryCount) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 429) {
          // Not a rate-limit error — stop retrying and let it propagate.
          return throwError(() => error);
        }
        const retryAfterMs = parseRetryAfter(error.headers.get('Retry-After'));
        const backoffMs = retryAfterMs ?? BASE_DELAY_MS * 2 ** (retryCount - 1);
        // Add jitter (±25%) so concurrent bursts don't retry in lockstep.
        const jittered = backoffMs * (0.75 + Math.random() * 0.5);
        return timer(Math.min(jittered, MAX_DELAY_MS));
      },
    }),
  );

/**
 * Parse a `Retry-After` header into milliseconds. The header is either a number
 * of seconds or an HTTP date; returns `null` when absent/unparseable so the
 * caller falls back to exponential backoff.
 */
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}
