import { z } from 'zod';

/**
 * Runtime validation for the PUBLIC availability responses (OWASP trust boundary).
 *
 * The backend OpenAPI spec declares these operations as `void`, so the generated
 * `AvailabilityPublicService` requests them as text and DISCARDS the body — it is
 * unusable for reading data. We therefore call the endpoints with raw HttpClient
 * (see `AvailabilityFeatureService`) and these Zod schemas are the only guarantee
 * of the JSON shape before it reaches the booking UI.
 */

/** One bookable inspection start. `time` is a full ISO string; `formattedTime` is "HH:mm" for display. */
export const timeSlotSchema = z.object({
  time: z.string().min(1),
  formattedTime: z.string().min(1),
});

/** One calendar day. `available` already factors in weekly rules + date exceptions. */
export const dayAvailabilitySchema = z.object({
  date: z.string().min(1), // YYYY-MM-DD (Houston time)
  available: z.boolean(),
  reason: z.string().nullish(),
});

const timeSlotsResponseSchema = z.array(timeSlotSchema);
const calendarResponseSchema = z.array(dayAvailabilitySchema);

export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type DayAvailability = z.infer<typeof dayAvailabilitySchema>;

export function parseTimeSlots(data: unknown): TimeSlot[] {
  return timeSlotsResponseSchema.parse(data);
}

export function parseCalendar(data: unknown): DayAvailability[] {
  return calendarResponseSchema.parse(data);
}
