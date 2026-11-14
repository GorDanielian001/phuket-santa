## Project rules

- Calendar rules live in `src/lib/schedule.ts`. Prices and add-ons live in `src/lib/pricing.ts`, shared by the calculator and the server.
- Booking checks, writes and the notification queue are transactional. Keep Telegram credentials and the SQLite file outside public assets and version control.
