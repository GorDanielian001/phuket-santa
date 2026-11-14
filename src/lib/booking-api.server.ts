import {
  AVAILABILITY_ENDPOINT,
  BOOKING_ENDPOINT,
  CALENDAR_ENDPOINT,
  type BookingRequest,
} from "./booking.ts";
import type { AsyncBookingStore } from "./booking-store.server.ts";
import { DISTRICTS, VENUE_LABELS, type KidsOption, type VenueId } from "./pricing.ts";
import { isProgram, isSeasonDate, normalizeSlot } from "./schedule.ts";
import type { createTelegram } from "./telegram.server.ts";

export const TELEGRAM_ENDPOINT = "/api/telegram/webhook";

function json(body: unknown, status = 200, allow?: string) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (allow) headers.set("Allow", allow);
  return Response.json(body, { status, headers });
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json" || !request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function validatedBooking(input: unknown): BookingRequest | null {
  const body = record(input);
  const selection = record(body?.["selection"]);
  const extras = record(selection?.["extras"]);
  if (!body || !selection || !extras) return null;
  const { date, time, program, kids, venue, district } = selection;
  const { gifts, photographer, letter } = extras;
  const { name, contact, address, notes, requestId } = body;
  if (
    typeof date !== "string" ||
    !isSeasonDate(date) ||
    typeof time !== "string" ||
    !/^\d{2}:\d{2}$/.test(time) ||
    !isProgram(program) ||
    typeof kids !== "number" ||
    !Number.isInteger(kids) ||
    kids < 1 ||
    kids > 5 ||
    typeof venue !== "string" ||
    !Object.hasOwn(VENUE_LABELS, venue) ||
    typeof district !== "string" ||
    !DISTRICTS.some((item) => item.id === district) ||
    typeof gifts !== "boolean" ||
    typeof photographer !== "boolean" ||
    typeof letter !== "boolean" ||
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.length > 80 ||
    typeof contact !== "string" ||
    contact.trim().length < 4 ||
    contact.length > 80 ||
    typeof address !== "string" ||
    address.trim().length < 3 ||
    address.length > 200 ||
    typeof notes !== "string" ||
    notes.length > 1000 ||
    typeof requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
  )
    return null;
  return {
    selection: {
      ...normalizeSlot(date, time),
      program,
      kids: kids as KidsOption,
      venue: venue as VenueId,
      district,
      extras: { gifts, photographer, letter },
    },
    name: name.trim(),
    contact: contact.trim(),
    address: address.trim(),
    notes: notes.trim(),
    requestId,
  };
}

export function createBookingApi(
  store: AsyncBookingStore,
  telegram: ReturnType<typeof createTelegram> | null,
  siteOrigin?: string,
  defer?: (task: Promise<void>) => void,
) {
  const configuredOrigin = siteOrigin ? new URL(siteOrigin).origin : null;
  const flush = () => {
    if (!telegram) return;
    const task = telegram
      .drain()
      .catch(() => console.error("Не удалось обработать очередь заявок."));
    defer?.(task);
  };

  return {
    flush,
    async handle(request: Request): Promise<Response | undefined> {
      const url = new URL(request.url);
      if (url.pathname === AVAILABILITY_ENDPOINT) {
        if (request.method !== "GET")
          return json({ error: "Метод не поддерживается." }, 405, "GET");
        const date = url.searchParams.get("date");
        const program = url.searchParams.get("program");
        if (!date || !isSeasonDate(date) || !isProgram(program)) {
          return json({ error: "Выберите дату и программу." }, 400);
        }
        return json({ times: await store.available(date, program) });
      }
      if (url.pathname === CALENDAR_ENDPOINT) {
        if (request.method !== "GET")
          return json({ error: "Метод не поддерживается." }, 405, "GET");
        const program = url.searchParams.get("program");
        if (!isProgram(program)) return json({ error: "Выберите программу." }, 400);
        return json({ days: await store.calendar(program) });
      }
      if (url.pathname === BOOKING_ENDPOINT) {
        if (request.method !== "POST")
          return json({ error: "Метод не поддерживается." }, 405, "POST");
        const origin = request.headers.get("origin");
        const publicOrigin = configuredOrigin ?? url.origin;
        if (
          request.headers.get("sec-fetch-site") === "cross-site" ||
          (origin && origin !== publicOrigin)
        ) {
          return json({ error: "Источник запроса не разрешён." }, 403);
        }
        const booking = validatedBooking(await readJson(request, 8_192));
        if (!booking) return json({ error: "Проверьте данные заявки." }, 400);
        const result = await store.book(booking);
        switch (result.outcome) {
          case "created":
          case "existing":
            flush();
            return json(result.receipt, result.outcome === "created" ? 201 : 200);
          case "expired":
          case "rejected":
          case "unavailable":
            return json(
              {
                code: "slot_unavailable",
                error: "Выбранное время уже недоступно. Выберите другое.",
              },
              409,
            );
          case "duplicate":
            return json({ error: "Заявка с этим номером запроса уже существует." }, 409);
          case "invalid":
            return json({ error: "Эта программа недоступна в выбранное время." }, 400);
        }
      }
      if (url.pathname === TELEGRAM_ENDPOINT) {
        if (request.method !== "POST")
          return json({ error: "Метод не поддерживается." }, 405, "POST");
        if (!telegram?.authorizes(request.headers.get("x-telegram-bot-api-secret-token"))) {
          return json({ error: "Доступ запрещён." }, 403);
        }
        const update = await readJson(request, 65_536);
        if (!record(update)) return json({ error: "Неверный запрос." }, 400);
        try {
          await telegram.callback(update);
        } catch {
          console.error("Не удалось обновить карточку в Telegram.");
          return json({ error: "Не удалось обновить карточку." }, 503);
        }
        return json({ ok: true });
      }
      return undefined;
    },
  };
}
