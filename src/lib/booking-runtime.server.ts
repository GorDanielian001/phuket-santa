import { createBookingApi } from "./booking-api.server.ts";
import { openBookingStore } from "./booking-store.server.ts";
import { createTelegram, telegramConfig } from "./telegram.server.ts";

type BookingApi = ReturnType<typeof createBookingApi>;
const processState = globalThis as typeof globalThis & { __phuketBookingApi?: BookingApi };

export function startBookingApi(): BookingApi {
  if (processState.__phuketBookingApi) return processState.__phuketBookingApi;
  const config = telegramConfig();
  const origin = process.env["PUBLIC_ORIGIN"]?.trim();
  const store = openBookingStore(process.env["BOOKING_DB_PATH"] || "./data/bookings.sqlite");
  try {
    const telegram = config ? createTelegram(store, config) : null;
    const api = createBookingApi(store, telegram, origin);
    processState.__phuketBookingApi = api;
    if (telegram) {
      api.flush();
      setInterval(api.flush, 15_000).unref();
    }
    return api;
  } catch (error) {
    store.close();
    throw error;
  }
}
