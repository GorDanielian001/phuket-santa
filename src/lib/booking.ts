import type { Selection } from "./pricing.ts";

export const BOOKING_ENDPOINT = "/api/bookings";
export const AVAILABILITY_ENDPOINT = "/api/availability";
export const CALENDAR_ENDPOINT = "/api/calendar";

export interface BookingReceipt {
  id: number;
  total: number;
  holdUntil: number;
}

export interface Availability {
  times: string[];
}

/** Free starts left on each season date for one program. */
export interface CalendarAvailability {
  days: Record<string, number>;
}

export interface BookingRequest {
  selection: Selection;
  name: string;
  contact: string;
  address: string;
  notes: string;
  requestId: string;
}
