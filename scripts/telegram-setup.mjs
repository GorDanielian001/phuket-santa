import { randomBytes } from "node:crypto";

const mode = process.argv[2];
if (mode === "secret") {
  console.log(randomBytes(32).toString("hex"));
} else {
  try {
    if (mode !== "chat" && mode !== "webhook") {
      throw new Error("Укажите режим chat, secret или webhook.");
    }
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token || !/^\d+:[\w-]+$/.test(token)) throw new Error("Заполните TELEGRAM_BOT_TOKEN.");

    async function telegram(method, payload) {
      let response;
      try {
        response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new Error("Telegram API недоступен.");
      }
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(`Telegram ${method}: HTTP ${response.status}.`);
      return result.result;
    }

    if (mode === "chat") {
      const info = await telegram("getWebhookInfo", {});
      if (info.url) throw new Error("Webhook уже настроен. Используйте известный ID личного чата.");
      const updates = await telegram("getUpdates", { allowed_updates: ["message"], timeout: 0 });
      const chats = new Map(
        updates
          .map((update) => update.message?.chat)
          .filter((chat) => chat?.type === "private")
          .map((chat) => [chat.id, chat.username ? `@${chat.username}` : chat.first_name]),
      );
      if (!chats.size) throw new Error("Откройте личный чат с ботом и отправьте /start.");
      for (const [id, name] of chats) console.log(`${id}  ${name}`);
    } else {
      const origin = new URL(process.env.PUBLIC_ORIGIN || "http://localhost");
      if (origin.protocol !== "https:" || origin.href !== origin.origin + "/") {
        throw new Error("Укажите HTTPS-адрес сайта в PUBLIC_ORIGIN без пути.");
      }
      const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
      if (
        !chatId ||
        !/^[1-9]\d*$/.test(chatId) ||
        !secret ||
        !/^[A-Za-z0-9_-]{16,256}$/.test(secret)
      ) {
        throw new Error("Заполните TELEGRAM_CHAT_ID и TELEGRAM_WEBHOOK_SECRET.");
      }
      const chat = await telegram("getChat", { chat_id: chatId });
      if (chat.type !== "private") {
        throw new Error("TELEGRAM_CHAT_ID должен указывать на личный чат.");
      }
      await telegram("setWebhook", {
        url: new URL("/api/telegram/webhook", origin).href,
        secret_token: secret,
        allowed_updates: ["callback_query"],
      });
      console.log(
        "Webhook подключён. Отправьте тестовую заявку с сайта и проверьте кнопки в чате с ботом.",
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
