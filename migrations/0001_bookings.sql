CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
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

CREATE INDEX IF NOT EXISTS telegram_pending ON telegram_outbox(next_attempt, booking_id) WHERE sent_at IS NULL;

CREATE TRIGGER IF NOT EXISTS enqueue_booking AFTER INSERT ON bookings
BEGIN
  INSERT INTO telegram_outbox (booking_id, next_attempt) VALUES (NEW.id, 0);
END;
