import type { BookingRequest } from "./booking.ts";
import type { AsyncBookingStore, BookingStatus } from "./booking-store.server.ts";
import { calculate } from "./pricing.ts";
import { offeredTimes, programInterval } from "./schedule.ts";

type Statement = {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};
export type BookingDatabase = { prepare(sql: string): Statement };

type Row = {
  id: number;
  total: number;
  payload: string;
  hold_until: number;
  status: Exclude<BookingStatus, "expired">;
};
const active = "(status = 'confirmed' OR (status = 'pending' AND hold_until > ?))";
const currentStatus = (row: Row, now: number): BookingStatus =>
  row.status === "pending" && row.hold_until <= now ? "expired" : row.status;
const receipt = (row: Row) => ({ id: row.id, total: row.total, holdUntil: row.hold_until });
const booking = (row: Row) => JSON.parse(row.payload) as Omit<BookingRequest, "requestId">;

export function openD1BookingStore(db: BookingDatabase): AsyncBookingStore {
  return {
    async available(date, program, now = Date.now()) {
      const options = offeredTimes(date, program)
        .map((time) => ({
          time,
          ...programInterval(date, time, program),
        }))
        .filter((option) => option.start > now);
      const first = options[0];
      const last = options.at(-1);
      if (!first || !last) return [];
      const { results } = await db
        .prepare(
          `
        SELECT start_at, end_at FROM bookings
        WHERE start_at < ? AND end_at > ? AND ${active}
      `,
        )
        .bind(last.end, first.start, now)
        .all<{ start_at: number; end_at: number }>();
      return options
        .filter(
          ({ start, end }) => !results.some((row) => row.start_at < end && row.end_at > start),
        )
        .map(({ time }) => time);
    },
    async book(request, now = Date.now()) {
      const { requestId, selection, name, contact, address, notes } = request;
      const { date, time, program } = selection;
      if (!date || !time || !program || !offeredTimes(date, program).includes(time)) {
        return { outcome: "invalid" };
      }
      const { start, end } = programInterval(date, time, program);
      const payload = JSON.stringify({ selection, name, contact, address, notes });
      const holdUntil = Math.min(start, now + 30 * 60_000);
      // The overlap check and insert are one SQL write. The trigger adds the outbox row in that write.
      const created = await db
        .prepare(
          `
        INSERT INTO bookings (request_id, payload, start_at, end_at, total, hold_until)
        SELECT ?, ?, ?, ?, ?, ? WHERE ? > ? AND NOT EXISTS (
          SELECT 1 FROM bookings WHERE start_at < ? AND end_at > ? AND ${active}
        )
        ON CONFLICT(request_id) DO NOTHING
        RETURNING id, total, hold_until
      `,
        )
        .bind(
          requestId,
          payload,
          start,
          end,
          calculate(selection).total,
          holdUntil,
          start,
          now,
          end,
          start,
          now,
        )
        .first<Row>();
      if (created) return { outcome: "created", receipt: receipt(created) };
      const previous = await db
        .prepare("SELECT * FROM bookings WHERE request_id = ?")
        .bind(requestId)
        .first<Row>();
      if (!previous) return { outcome: "unavailable" };
      if (previous.payload !== payload) return { outcome: "duplicate" };
      const status = currentStatus(previous, now);
      if (status === "expired" || status === "rejected") return { outcome: status };
      return { outcome: "existing", receipt: receipt(previous) };
    },
    async decide(id, decision, now = Date.now()) {
      const row = await db
        .prepare(
          `
        UPDATE bookings SET status = CASE
          WHEN status = 'pending' AND hold_until > ? THEN ? ELSE status END
        WHERE id = ? RETURNING *
      `,
        )
        .bind(now, decision, id)
        .first<Row>();
      return (
        row && {
          status: row.status === "pending" ? "expired" : row.status,
          booking: booking(row),
          total: row.total,
          holdUntil: row.hold_until,
        }
      );
    },
    async nextNotification(now = Date.now()) {
      const lease = crypto.randomUUID();
      const next = await db
        .prepare(
          `
        UPDATE telegram_outbox SET lease = ?, lease_until = ?
        WHERE booking_id = (
          SELECT booking_id FROM telegram_outbox WHERE sent_at IS NULL AND next_attempt <= ?
            AND (lease_until IS NULL OR lease_until <= ?)
          ORDER BY next_attempt, booking_id LIMIT 1
        )
        RETURNING booking_id, attempts
      `,
        )
        .bind(lease, now + 60_000, now, now)
        .first<{ booking_id: number; attempts: number }>();
      if (!next) return null;
      const row = await db
        .prepare("SELECT * FROM bookings WHERE id = ?")
        .bind(next.booking_id)
        .first<Row>();
      if (!row) return null;
      return {
        id: row.id,
        attempts: next.attempts,
        lease,
        status: currentStatus(row, now),
        booking: booking(row),
        total: row.total,
        holdUntil: row.hold_until,
      };
    },
    async delivered(id, lease, now = Date.now()) {
      await db
        .prepare(
          `
        UPDATE telegram_outbox SET sent_at = ?, lease = NULL, lease_until = NULL
        WHERE booking_id = ? AND lease = ?
      `,
        )
        .bind(now, id, lease)
        .run();
    },
    async reschedule(id, lease, nextAttempt) {
      await db
        .prepare(
          `
        UPDATE telegram_outbox SET next_attempt = ?, attempts = attempts + 1,
          lease = NULL, lease_until = NULL WHERE booking_id = ? AND lease = ?
      `,
        )
        .bind(nextAttempt, id, lease)
        .run();
    },
  };
}
