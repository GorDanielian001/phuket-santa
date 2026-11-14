import { startBookingApi } from "../src/lib/booking-runtime.server.ts";

startBookingApi();
await import("../.output/server/index.mjs");
