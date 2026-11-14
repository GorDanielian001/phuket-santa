import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { openD1BookingStore } from "../src/lib/d1-booking-store.server.ts";
import { phuketTimestamp } from "../src/lib/schedule.ts";

test("D1 SQL atomically reserves slots, expires holds, and leases notifications", async (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec(readFileSync(new URL("../migrations/0001_bookings.sql", import.meta.url), "utf8"));
  const store = openD1BookingStore({
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        bind(...args) {
          return {
            async first() {
              return statement.get(...args) ?? null;
            },
            async all() {
              return { results: statement.all(...args) };
            },
            async run() {
              return statement.run(...args);
            },
          };
        },
      };
    },
  });
  const date = "2026-12-31";
  const now = phuketTimestamp(date, "10:00");
  const req = {
    name: "Анна",
    contact: "@example",
    address: "Камала",
    notes: "",
    requestId: randomUUID(),
    selection: {
      date,
      time: "21:00",
      program: "vip",
      kids: 2,
      venue: "villa",
      district: "kamala",
      extras: { gifts: false, photographer: false, letter: false },
    },
  };
  const competitor = { ...req, requestId: randomUUID() };
  const [first, other] = await Promise.all([store.book(req, now), store.book(competitor, now)]);
  assert.equal(first.outcome, "created");
  assert.equal(first.receipt.total, 29000);
  assert.equal(other.outcome, "unavailable");
  assert.equal((await store.book(req, now)).outcome, "existing");
  assert.equal((await store.book({ ...req, notes: "Different" }, now)).outcome, "duplicate");
  const options = await store.available(date, "express", now);
  assert(!options.includes("21:00"));
  assert(!options.includes("21:30"));
  assert(options.includes("22:00"));
  assert(options.includes("24:00"));
  assert(!options.includes("11:30"));
  assert.equal((await store.calendar("express", now))[date], options.length);
  const tooSoon = {
    ...req,
    requestId: randomUUID(),
    selection: { ...req.selection, time: "11:30" },
  };
  assert.equal((await store.book(tooSoon, now)).outcome, "unavailable");
  const leased = await store.nextNotification(now);
  assert.equal(leased.id, first.receipt.id);
  assert.equal(await store.nextNotification(now), null);
  await store.reschedule(leased.id, leased.lease, now + 15000);
  const retry = await store.nextNotification(now + 15000);
  assert.equal(retry.attempts, 1);
  await store.delivered(retry.id, retry.lease, now + 15000);
  assert.equal(await store.nextNotification(now + 15000), null);
  assert.equal(
    (await store.decide(leased.id, "confirmed", first.receipt.holdUntil)).status,
    "expired",
  );
  const fresh = await store.book(competitor, first.receipt.holdUntil);
  assert.equal(fresh.outcome, "created");
  assert.equal(
    (await store.decide(fresh.receipt.id, "confirmed", now + 31 * 60000)).status,
    "confirmed",
  );
  assert.equal(
    (await store.decide(fresh.receipt.id, "rejected", now + 32 * 60000)).status,
    "confirmed",
  );
});
