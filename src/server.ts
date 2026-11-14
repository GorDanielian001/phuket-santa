import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { AVAILABILITY_ENDPOINT, BOOKING_ENDPOINT, CALENDAR_ENDPOINT } from "./lib/booking.ts";
import { TELEGRAM_ENDPOINT } from "./lib/booking-api.server.ts";
import { startBookingApi } from "./lib/booking-runtime.server.ts";

const paths = new Set([
  AVAILABILITY_ENDPOINT,
  BOOKING_ENDPOINT,
  CALENDAR_ENDPOINT,
  TELEGRAM_ENDPOINT,
]);

export default createServerEntry({
  async fetch(request, options) {
    if (!paths.has(new URL(request.url).pathname)) return handler.fetch(request, options);
    try {
      return (await startBookingApi().handle(request)) ?? new Response(null, { status: 404 });
    } catch {
      console.error("Не удалось обработать запрос к системе бронирования.");
      return Response.json(
        { error: "Сервис записи временно недоступен. Попробуйте ещё раз." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  },
});
