import { timingSafeEqual } from "node:crypto";
import { DISTRICTS, formatTHB, PROGRAM_INFO, VENUE_LABELS } from "./pricing.ts";
import type { BookingStatus, AsyncBookingStore } from "./booking-store.server.ts";
import type { BookingRequest } from "./booking.ts";

type TelegramConfig = { token: string; chatId: string; secret: string };
type TelegramCall = (method: string, payload: Record<string, unknown>) => Promise<void>;
type BookingMessage = {
  id: number;
  booking: Omit<BookingRequest, "requestId">;
  total: number;
  holdUntil: number;
  status: BookingStatus;
};

export function telegramConfig(
  env: Record<string, string | undefined> = process.env,
): TelegramConfig | null {
  const token = env["TELEGRAM_BOT_TOKEN"]?.trim();
  const chatId = env["TELEGRAM_CHAT_ID"]?.trim();
  const secret = env["TELEGRAM_WEBHOOK_SECRET"]?.trim();
  if (!token && !chatId && !secret) return null;
  if (
    !token ||
    !/^\d+:[\w-]+$/.test(token) ||
    !chatId ||
    !/^[1-9]\d*$/.test(chatId) ||
    !secret ||
    !/^[A-Za-z0-9_-]{16,256}$/.test(secret)
  ) {
    throw new Error(
      "Invalid Telegram configuration. Set the bot token, private chat ID and webhook secret.",
    );
  }
  return { token, chatId, secret };
}

function telegramCall(token: string): TelegramCall {
  return async (method, payload) => {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    const result = (await response.json()) as { ok?: boolean; description?: string };
    if (method === "editMessageText" && result.description?.includes("message is not modified"))
      return;
    if (!response.ok || result.ok !== true)
      throw new Error(`Telegram ${method}: HTTP ${response.status}`);
  };
}

const statusNames = {
  pending: "Ожидает подтверждения",
  confirmed: "Бронь подтверждена",
  rejected: "Заявка отклонена",
  expired: "Время удержания истекло",
};

const localTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Bangkok",
  dateStyle: "short",
  timeStyle: "short",
});

function message({ id, booking, total, holdUntil, status }: BookingMessage) {
  const { selection: sel, name, contact, address, notes } = booking;
  const program = sel.program ? PROGRAM_INFO[sel.program] : null;
  const district = DISTRICTS.find((item) => item.id === sel.district);
  const extras = [
    sel.extras.gifts && "сладкие подарки",
    sel.extras.photographer && "фотограф",
    sel.extras.letter && "письмо",
  ]
    .filter(Boolean)
    .join(", ");
  return {
    text: [
      `Заявка №${id} · ${statusNames[status]}`,
      `${sel.date} · ${sel.time} по Пхукету`,
      program && `${program.title} · ${program.minutes} мин.`,
      `Детей: ${sel.kids === 5 ? "5+" : sel.kids}`,
      sel.venue && VENUE_LABELS[sel.venue],
      district && `Район: ${district.name}`,
      `Адрес: ${address}`,
      `Клиент: ${name} · ${contact}`,
      extras && `Дополнительно: ${extras}`,
      notes && `Пожелания: ${notes}`,
      `Итого: ${formatTHB(total)}`,
      status === "pending" && `Время удерживается до ${localTime.format(holdUntil)} по Пхукету.`,
    ]
      .filter(Boolean)
      .join("\n"),
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard:
        status === "pending"
          ? [
              [
                { text: "Подтвердить", callback_data: `confirmed:${id}` },
                { text: "Отклонить", callback_data: `rejected:${id}` },
              ],
            ]
          : [],
    },
  };
}

export function createTelegram(
  store: AsyncBookingStore,
  config: TelegramConfig,
  call = telegramCall(config.token),
) {
  let sending = false;
  return {
    async drain() {
      if (sending) return;
      sending = true;
      try {
        for (let index = 0; index < 10; index++) {
          const item = await store.nextNotification();
          if (!item) return;
          try {
            await call("sendMessage", { chat_id: config.chatId, ...message(item) });
          } catch {
            const delay = Math.min(15_000 * 2 ** Math.min(item.attempts, 6), 15 * 60_000);
            await store.reschedule(item.id, item.lease, Date.now() + delay);
            console.error(`Telegram: доставка заявки №${item.id} отложена.`);
            continue;
          }
          await store.delivered(item.id, item.lease);
        }
      } finally {
        sending = false;
      }
    },
    authorizes(secret: string | null) {
      const received = Buffer.from(secret ?? "");
      const expected = Buffer.from(config.secret);
      return received.length === expected.length && timingSafeEqual(received, expected);
    },
    async callback(update: unknown) {
      if (!update || typeof update !== "object") return;
      const { callback_query: query } = update as {
        callback_query?: {
          id?: string;
          data?: string;
          from?: { id?: number };
          message?: { message_id?: number; chat?: { id?: number; type?: string } };
        };
      };
      if (!query || typeof query.id !== "string" || typeof query.data !== "string") return;
      const chat = query.message?.chat;
      if (
        !chat ||
        String(chat.id ?? "") !== config.chatId ||
        chat.type !== "private" ||
        String(query.from?.id ?? "") !== config.chatId ||
        !Number.isSafeInteger(query.message?.message_id)
      ) {
        await call("answerCallbackQuery", {
          callback_query_id: query.id,
          text: "Чат не авторизован.",
        });
        return;
      }
      const [action, rawId, ...extra] = query.data.split(":");
      if (
        (action !== "confirmed" && action !== "rejected") ||
        !rawId ||
        !/^\d+$/.test(rawId) ||
        extra.length
      )
        return;
      const id = Number(rawId);
      if (!Number.isSafeInteger(id)) return;
      const result = await store.decide(id, action);
      try {
        await call("answerCallbackQuery", {
          callback_query_id: query.id,
          text: result ? statusNames[result.status] : "Заявка не найдена.",
        });
      } catch {
        console.warn("Telegram: не удалось ответить на нажатие кнопки.");
      }
      if (result) {
        await call("editMessageText", {
          chat_id: config.chatId,
          message_id: query.message?.message_id,
          ...message({ id, ...result }),
        });
      }
    },
  };
}
