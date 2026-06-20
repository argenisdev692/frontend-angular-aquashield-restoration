// Re-export the generated response models for convenient feature-local imports.
export type {
  AvailabilityExceptionResponse,
  AvailabilityRuleResponse,
  PaginatedExceptionResponse,
} from '../../../api/models';

/**
 * The generated ng-openapi-gen client discards the request bodies for the
 * availability write endpoints (their OpenAPI operations declare no body), so
 * we define the DTO shapes locally and POST/PATCH/PUT them via raw HttpClient.
 */
export interface CreateExceptionDto {
  /** ISO date (YYYY-MM-DD) the exception applies to. */
  date: string;
  /** Whether the business is available on that date. */
  isAvailable: boolean;
  /** Optional human-readable reason (e.g. "Public holiday"). */
  reason?: string | null;
  /** Lifecycle status. */
  status?: 'active' | 'suspended';
}

export type UpdateExceptionDto = Partial<CreateExceptionDto>;

/** Body for upserting a weekly availability rule (PUT /availability/rules/{dayOfWeek}). */
export interface UpsertRuleDto {
  isAvailable: boolean;
  /** "HH:mm" 24h start time. */
  startTime: string;
  /** "HH:mm" 24h end time. */
  endTime: string;
}
