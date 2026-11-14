import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mock, test } from "node:test";
import { createBookingApi } from "../src/lib/booking-api.server.ts";
import { openBookingStore } from "../src/lib/booking-store.server.ts";
import { programPrice } from "../src/lib/pricing.ts";
import { offeredTimes, phuketTimestamp } from "../src/lib/schedule.ts";
import { createTelegram } from "../src/lib/telegram.server.ts";

const now = phuketTimestamp("2026-12-30", "10:00");
const date = "2026-12-30";
const eve = "2026-12-31";
const newYear = "2027-01-01";
const telegramConfig = {
  token: "123:fake",
  chatId: "123456789",
  secret: "testing-secret-only",
};

function request(time = "16:00", program = "khorovod", day = date) {
  return {
    requestId: randomUUID(),
    name: "Анна",
    contact: "@anna_example",
    address: "Вилла в Камале",
    notes: "",
    selection: {
      date: day,
      time,
      program,
      kids: 2,
      venue: "villa",
      district: "kamala",
      extras: { gifts: false, photographer: false, letter: false },
    },
  };
}

function setup(t) {
  const store = openBookingStore(":memory:");
  t.after(() => store.close());
  return store;
}

function post(path, body, headers = {}) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function callback(id, action, chatId = telegramConfig.chatId, fromId = chatId) {
  return {
    callback_query: {
      id: "sample-callback",
      data: `${action}:${id}`,
      from: { id: Number(fromId) },
      message: { message_id: 5, chat: { id: Number(chatId), type: "private" } },
    },
  };
}

test("all price bands, schedule boundaries and midnight booking options", () => {
  const programs = ["express", "khorovod", "vip"];
  const at = (day, time) => programs.map((program) => programPrice(program, day, time));
  assert.deepEqual(at(date, "22:00"), [8000, 10500, 16000]);
  assert.deepEqual(at(eve, "16:30"), [10000, 13000, 19000]);
  assert.deepEqual(at(eve, "17:00"), [13000, 17000, 24000]);
  assert.deepEqual(at(eve, "20:30"), [13000, 17000, 24000]);
  assert.deepEqual(at(eve, "21:00"), [16000, 20000, 29000]);
  assert.deepEqual(at(eve, "23:00"), [16000, 20000, 29000]);
  assert.deepEqual(at(newYear, "00:00"), [32000, 40000, null]);
  assert.deepEqual(at(newYear, "10:00"), [8000, 10500, 16000]);
  assert.deepEqual(offeredTimes(date, "express").slice(0, 3), ["10:00", "10:30", "11:00"]);
  assert.equal(offeredTimes(date, "express").at(-1), "22:00");
  assert.equal(offeredTimes(eve, "express").at(-1), "23:00");
  assert.equal(offeredTimes(newYear, "express")[0], "00:00");
  assert.equal(offeredTimes(newYear, "vip")[0], "10:00");
  assert.equal(phuketTimestamp(newYear, "00:00"), Date.parse("2026-12-31T17:00:00Z"));
});

test("the actual duration blocks overlapping starts in both directions", (t) => {
  const store = setup(t);
  assert.equal(store.book(request("16:00", "express"), now).outcome, "created");
  assert.equal(store.book(request("16:00", "khorovod"), now).outcome, "unavailable");
  assert.equal(store.book(request("15:30", "vip"), now).outcome, "unavailable");
  assert.equal(store.book(request("15:30", "khorovod"), now).outcome, "created");
  assert.equal(store.book(request("16:30", "vip"), now).outcome, "created");
  assert(!store.available(date, "express", now).includes("17:00"));
  assert(store.available(date, "express", now).includes("17:30"));
  assert(!store.available(date, "express", now).includes("10:00"));
});

test("midnight has its own date, shares interval edges, and rejects the hour and 23:30", (t) => {
  const store = setup(t);
  assert.equal(store.book(request("23:30", "express", eve), now).outcome, "invalid");
  assert.equal(store.book(request("00:00", "vip", newYear), now).outcome, "invalid");
  assert.equal(store.book(request("23:00", "vip", eve), now).receipt.total, 29000);
  assert.equal(store.book(request("00:00", "express", newYear), now).receipt.total, 32000);
  assert.equal(store.book(request("00:00", "khorovod", newYear), now).outcome, "unavailable");
});

test("retry returns the same receipt; reject or expiry releases only pending holds", (t) => {
  const store = setup(t);
  const first = request();
  const { receipt } = store.book(first, now);
  assert.deepEqual(store.book(first, now + 1000), { outcome: "existing", receipt });
  assert.equal(store.book({ ...first, address: "Другой адрес" }, now).outcome, "duplicate");
  assert.equal(store.decide(receipt.id, "rejected", now).status, "rejected");
  assert.equal(store.decide(receipt.id, "confirmed", now).status, "rejected");
  const { receipt: second } = store.book(request(), now);
  assert.equal(store.decide(second.id, "confirmed", second.holdUntil).status, "expired");
  const { receipt: third } = store.book(request(), second.holdUntil);
  assert.equal(store.decide(third.id, "confirmed", second.holdUntil).status, "confirmed");
  assert.equal(store.book(request(), third.holdUntil).outcome, "unavailable");
});

test("holds end at the start time for a last-minute request", (t) => {
  const store = setup(t);
  const start = phuketTimestamp(date, "16:00");
  const created = store.book(request(), start - 60_000);
  assert.equal(created.receipt.holdUntil, start);
  assert.equal(store.decide(created.receipt.id, "confirmed", start).status, "expired");
  assert.equal(store.book(request(), start).outcome, "unavailable");
});

test("a second SQLite connection sees both the booking and the notification lease", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "phuket-bookings-"));
  const path = join(dir, "bookings.sqlite");
  const first = openBookingStore(path);
  const second = openBookingStore(path);
  t.after(() => {
    first.close();
    second.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const { receipt } = first.book(request(), now);
  assert.equal(second.book(request(), now).outcome, "unavailable");
  const notification = second.nextNotification(now);
  assert.equal(notification.id, receipt.id);
  assert.equal(first.nextNotification(now), null);
  second.reschedule(notification.id, notification.lease, now + 5000);
  assert.equal(first.nextNotification(now + 4999), null);
  const retry = first.nextNotification(now + 5000);
  assert.equal(retry.attempts, 1);
  first.delivered(retry.id, retry.lease, now + 5000);
  assert.equal(second.nextNotification(now + 60_000), null);
});

test("public API validates data, rejects foreign origins and lists remaining times", async (t) => {
  t.mock.method(Date, "now", () => now);
  const api = createBookingApi(setup(t), null, "https://bookings.example/");
  const booking = request();
  assert.equal(
    (await api.handle(post("/api/bookings", booking, { Origin: "https://elsewhere.example" })))
      .status,
    403,
  );
  assert.equal((await api.handle(post("/api/bookings", { ...booking, address: "" }))).status, 400);
  const accepted = await api.handle(
    post("/api/bookings", { ...booking, total: 1 }, { Origin: "https://bookings.example" }),
  );
  assert.equal(accepted.status, 201);
  assert.equal((await accepted.json()).total, 10500);
  assert.equal((await api.handle(post("/api/bookings", booking))).status, 200);
  assert.equal((await api.handle(post("/api/bookings", request()))).status, 409);
  const slots = await api.handle(
    new Request(`http://localhost:3000/api/availability?date=${date}&program=khorovod`),
  );
  assert.equal(slots.headers.get("cache-control"), "no-store");
  const { times } = await slots.json();
  assert(!times.includes("16:00"));
  assert(times.includes("16:30"));
});

test("Telegram notification retries; only the configured recipient can act on a booking", async (t) => {
  let clock = now;
  t.mock.method(Date, "now", () => clock);
  const store = setup(t);
  let failed = false;
  const call = mock.fn(async (method) => {
    if (method === "sendMessage" && !failed) {
      failed = true;
      throw new Error("simulated offline");
    }
  });
  const bot = createTelegram(store, telegramConfig, call);
  const api = createBookingApi(store, bot);
  const { receipt } = store.book(request(), now);
  await bot.drain();
  await bot.drain();
  assert.equal(call.mock.callCount(), 1);
  clock += 15_000;
  await bot.drain();
  assert.equal(call.mock.callCount(), 2);
  const [method, message] = call.mock.calls[1].arguments;
  assert.equal(method, "sendMessage");
  assert.equal(message.chat_id, telegramConfig.chatId);
  assert.match(message.text, /Вилла в Камале/);
  assert.deepEqual(
    message.reply_markup.inline_keyboard[0].map((button) => button.callback_data),
    [`confirmed:${receipt.id}`, `rejected:${receipt.id}`],
  );
  const hook = "/api/telegram/webhook";
  const auth = { "X-Telegram-Bot-Api-Secret-Token": telegramConfig.secret };
  assert.equal((await api.handle(post(hook, callback(receipt.id, "confirmed")))).status, 403);
  assert.equal(
    (await api.handle(post(hook, callback(receipt.id, "confirmed", "987654321"), auth))).status,
    200,
  );
  assert.equal(
    (
      await api.handle(
        post(hook, callback(receipt.id, "confirmed", telegramConfig.chatId, "987654321"), auth),
      )
    ).status,
    200,
  );
  assert(!store.available(date, "express").includes("16:00"));
  assert.equal((await api.handle(post(hook, callback(receipt.id, "rejected"), auth))).status, 200);
  assert.match(call.mock.calls.at(-1).arguments[1].text, /Заявка отклонена/);
  assert(store.available(date, "express").includes("16:00"));
});
