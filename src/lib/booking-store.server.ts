import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { calculate, type ProgramId } from "./pricing.ts";
import {
  bufferedInterval,
  freeDays,
  freeTimes,
  isBookableStart,
  offeredTimes,
  programInterval,
  seasonRange,
  type BusyInterval,
} from "./schedule.ts";
import type { BookingReceipt, BookingRequest } from "./booking.ts";

export type BookingStatus = "pending" | "confirmed" | "rejected" | "expired";
type StoredBooking = {
  id: number;
  total: number;
  hold_until: number;
  status: Exclude<BookingStatus, "expired">;
  request_hash: string;
  payload: string;
};

function receipt(row: StoredBooking): BookingReceipt {
  return { id: row.id, total: row.total, holdUntil: row.hold_until };
}

function currentStatus(
  row: Pick<StoredBooking, "status" | "hold_until">,
  now: number,
): BookingStatus {
  return row.status === "pending" && row.hold_until <= now ? "expired" : row.status;
}

const HOLD_MS = 30 * 60_000;

export function openBookingStore(filename: string) {
  if (filename !== ":memory:")
    mkdirSync(dirname(resolve(filename)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA busy_timeout = 3000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      request_hash TEXT NOT NULL,
      payload TEXT NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL CHECK (end_at > start_at),
      total INTEGER NOT NULL CHECK (total >= 0),
      hold_until INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected'))
    );
    CREATE INDEX IF NOT EXISTS booking_intervals ON bookings(start_at, end_at);
    CREATE TABLE IF NOT EXISTS telegram_outbox (
      booking_id INTEGER PRIMARY KEY REFERENCES bookings(id),
      next_attempt INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      lease TEXT,
      lease_until INTEGER,
      sent_at INTEGER
    );
  `);
  const active = "(status = 'confirmed' OR (status = 'pending' AND hold_until > ?))";
  const overlap = db.prepare(`
    SELECT 1 FROM bookings WHERE start_at < ? AND end_at > ? AND ${active} LIMIT 1
  `);
  const busyBetween = db.prepare(`
    SELECT start_at, end_at FROM bookings WHERE start_at < ? AND end_at > ? AND ${active}
  `);
  const byRequest = db.prepare("SELECT * FROM bookings WHERE request_id = ?");
  const byId = db.prepare("SELECT * FROM bookings WHERE id = ?");
  const insert = db.prepare(`
    INSERT INTO bookings (request_id, request_hash, payload, start_at, end_at, total, hold_until)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const queue = db.prepare("INSERT INTO telegram_outbox (booking_id, next_attempt) VALUES (?, ?)");
  const statusUpdate = db.prepare(`
    UPDATE bookings SET status = ? WHERE id = ? AND status = 'pending' AND hold_until > ?
  `);
  const getNext = db.prepare(`
    SELECT o.booking_id, o.attempts, b.payload, b.total, b.hold_until, b.status
    FROM telegram_outbox AS o JOIN bookings AS b ON b.id = o.booking_id
    WHERE o.sent_at IS NULL AND o.next_attempt <= ? AND (o.lease_until IS NULL OR o.lease_until <= ?)
    ORDER BY o.next_attempt, o.booking_id LIMIT 1
  `);
  const claim = db.prepare(
    "UPDATE telegram_outbox SET lease = ?, lease_until = ? WHERE booking_id = ?",
  );
  const finish = db.prepare(`
    UPDATE telegram_outbox SET sent_at = ?, lease = NULL, lease_until = NULL
    WHERE booking_id = ? AND lease = ?
  `);
  const retry = db.prepare(`
    UPDATE telegram_outbox SET next_attempt = ?, attempts = attempts + 1, lease = NULL, lease_until = NULL
    WHERE booking_id = ? AND lease = ?
  `);

  function transaction<T>(work: () => T): T {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = work();
      db.exec("COMMIT");
      return value;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  return {
    close: () => db.close(),
    available(date: string, program: ProgramId, now = Date.now()) {
      const range = bufferedInterval({
        start: programInterval(date, "00:00", program).start,
        end: programInterval(date, "24:00", program).end,
      });
      const busy = busyBetween.all(range.end, range.start, now) as BusyInterval[];
      return freeTimes(date, program, busy, now);
    },
    calendar(program: ProgramId, now = Date.now()) {
      const range = seasonRange();
      const busy = busyBetween.all(range.end, range.start, now) as BusyInterval[];
      return freeDays(program, busy, now);
    },
    book(request: BookingRequest, now = Date.now()) {
      const { selection, name, contact, address, notes, requestId } = request;
      const { date, time, program } = selection;
      if (!date || !time || !program || !offeredTimes(date, program).includes(time)) {
        return { outcome: "invalid" } as const;
      }
      const payload = JSON.stringify({ selection, name, contact, address, notes });
      const hash = createHash("sha256").update(payload).digest("hex");
      const { start, end } = programInterval(date, time, program);
      const wide = bufferedInterval({ start, end });
      return transaction(() => {
        const previous = byRequest.get(requestId) as StoredBooking | undefined;
        if (previous) {
          if (previous.request_hash !== hash) return { outcome: "duplicate" } as const;
          const status = currentStatus(previous, now);
          if (status === "expired" || status === "rejected") return { outcome: status } as const;
          return { outcome: "existing", receipt: receipt(previous) } as const;
        }
        if (!isBookableStart(start, now) || overlap.get(wide.end, wide.start, now))
          return { outcome: "unavailable" } as const;
        const total = calculate(selection).total;
        const holdUntil = Math.min(start, now + HOLD_MS);
        const id = Number(
          insert.run(requestId, hash, payload, start, end, total, holdUntil).lastInsertRowid,
        );
        queue.run(id, now);
        return { outcome: "created", receipt: { id, total, holdUntil } } as const;
      });
    },
    decide(id: number, decision: "confirmed" | "rejected", now = Date.now()) {
      return transaction(() => {
        const row = byId.get(id) as StoredBooking | undefined;
        if (!row) return null;
        const status = currentStatus(row, now);
        if (status === "pending") statusUpdate.run(decision, id, now);
        return {
          status: status === "pending" ? decision : status,
          booking: JSON.parse(row.payload) as Omit<BookingRequest, "requestId">,
          total: row.total,
          holdUntil: row.hold_until,
        };
      });
    },
    nextNotification(now = Date.now()) {
      return transaction(() => {
        const row = getNext.get(now, now) as
          | (Omit<StoredBooking, "id" | "request_hash"> & {
              booking_id: number;
              attempts: number;
            })
          | undefined;
        if (!row) return null;
        const lease = randomUUID();
        claim.run(lease, now + 60_000, row.booking_id);
        return {
          id: row.booking_id,
          attempts: row.attempts,
          lease,
          status: currentStatus(row, now),
          booking: JSON.parse(row.payload) as Omit<BookingRequest, "requestId">,
          total: row.total,
          holdUntil: row.hold_until,
        };
      });
    },
    delivered(id: number, lease: string, now = Date.now()) {
      finish.run(now, id, lease);
    },
    reschedule(id: number, lease: string, nextAttempt: number) {
      retry.run(nextAttempt, id, lease);
    },
  };
}

export type BookingStore = ReturnType<typeof openBookingStore>;
export type AsyncBookingStore = {
  [K in Exclude<keyof BookingStore, "close">]: (
    ...args: Parameters<BookingStore[K]>
  ) => ReturnType<BookingStore[K]> | Promise<ReturnType<BookingStore[K]>>;
};
