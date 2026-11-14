import type { Selection } from "./pricing.ts";

export const BOOKING_ENDPOINT = "/api/bookings";
export const AVAILABILITY_ENDPOINT = "/api/availability";

export interface BookingReceipt {
  id: number;
  total: number;
  holdUntil: number;
}

export interface Availability {
  times: string[];
}

export interface BookingRequest {
  selection: Selection;
  name: string;
  contact: string;
  address: string;
  notes: string;
  requestId: string;
}
