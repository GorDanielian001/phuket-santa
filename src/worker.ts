import handler from "@tanstack/react-start/server-entry";
import { createBookingApi } from "./lib/booking-api.server.ts";
import { openD1BookingStore, type BookingDatabase } from "./lib/d1-booking-store.server.ts";
import { createTelegram, telegramConfig } from "./lib/telegram.server.ts";

type Env = {
  BOOKINGS: BookingDatabase;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
};
type Context = { waitUntil(task: Promise<unknown>): void };

function services(env: Env) {
  const store = openD1BookingStore(env.BOOKINGS);
  const config = telegramConfig({
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
    TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET,
  });
  return { store, telegram: config ? createTelegram(store, config) : null };
}

export default {
  async fetch(request: Request, env: Env, ctx: Context) {
    if (!new URL(request.url).pathname.startsWith("/api/")) return handler.fetch(request);
    try {
      const { store, telegram } = services(env);
      const api = createBookingApi(store, telegram, undefined, (task) => ctx.waitUntil(task));
      return (await api.handle(request)) ?? new Response(null, { status: 404 });
    } catch {
      console.error("Не удалось обработать запрос к системе бронирования.");
      return Response.json(
        { error: "Сервис записи временно недоступен. Попробуйте ещё раз." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  },
  async scheduled(_event: unknown, env: Env) {
    await services(env).telegram?.drain();
  },
};
