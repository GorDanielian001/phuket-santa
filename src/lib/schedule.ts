import {
  EVE_EVENING_FROM,
  EVE_LATE_FROM,
  MIDNIGHT,
  NEW_YEAR_DAY,
  NEW_YEAR_EVE,
  PROGRAM_INFO,
  programPrice,
  seasonDates,
  type ProgramId,
} from "./pricing.ts";

const SEASON = seasonDates();
const dates = new Set(SEASON);
const MINUTE = 60_000;

/** Starts are offered every 30 minutes from 10:00 to 22:00, and to 23:00 on 31 December. */
export const SLOT_STEP_MINUTES = 30;
const FIRST_START = 10 * 60;
const LAST_START = 22 * 60;
const LAST_START_EVE = 23 * 60;
/** One crew: a visit needs this much free time before and after it to cross the island. */
export const TRAVEL_BUFFER_MINUTES = 30;
/** The earliest start that can still be booked, counted from now. */
export const MIN_LEAD_MINUTES = 120;

export function isSeasonDate(date: string) {
  return dates.has(date);
}

/** Phuket has no daylight saving time, so a date plus minutes since midnight is exact. "24:00" is the next midnight. */
export function phuketTimestamp(date: string, time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return Date.parse(`${date}T00:00:00+07:00`) + (hours * 60 + minutes) * MINUTE;
}

function hhmm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function offeredTimes(date: string, program: ProgramId): string[] {
  if (!isSeasonDate(date)) return [];
  const last = date === NEW_YEAR_EVE ? LAST_START_EVE : LAST_START;
  const times = [];
  for (let minute = FIRST_START; minute <= last; minute += SLOT_STEP_MINUTES)
    times.push(hhmm(minute));
  if (date === NEW_YEAR_EVE && programPrice(program, date, MIDNIGHT) !== null) times.push(MIDNIGHT);
  return times;
}

/** Older pages sent the midnight visit as 1 January 00:00. It is now 31 December 24:00. */
export function normalizeSlot(date: string, time: string) {
  return date === NEW_YEAR_DAY && time === "00:00"
    ? { date: NEW_YEAR_EVE, time: MIDNIGHT }
    : { date, time };
}

export function programInterval(date: string, time: string, program: ProgramId) {
  const start = phuketTimestamp(date, time);
  return { start, end: start + PROGRAM_INFO[program].minutes * MINUTE };
}

export function isProgram(value: unknown): value is ProgramId {
  return typeof value === "string" && Object.hasOwn(PROGRAM_INFO, value);
}

export type BusyInterval = { start_at: number; end_at: number };

/** Interval bounds widened by the travel buffer, for overlap queries against stored visits. */
export function bufferedInterval({ start, end }: { start: number; end: number }) {
  return {
    start: start - TRAVEL_BUFFER_MINUTES * MINUTE,
    end: end + TRAVEL_BUFFER_MINUTES * MINUTE,
  };
}

export function earliestStart(now: number) {
  return now + MIN_LEAD_MINUTES * MINUTE;
}

export function isBookableStart(start: number, now: number) {
  return start >= earliestStart(now);
}

export function freeTimes(
  date: string,
  program: ProgramId,
  busy: BusyInterval[],
  now: number,
): string[] {
  return offeredTimes(date, program).filter((time) => {
    const interval = programInterval(date, time, program);
    if (!isBookableStart(interval.start, now)) return false;
    const wide = bufferedInterval(interval);
    return !busy.some((row) => row.start_at < wide.end && row.end_at > wide.start);
  });
}

/** Time range that holds every visit of the season, including buffers. */
export function seasonRange() {
  return bufferedInterval({
    start: phuketTimestamp(SEASON[0]!, "00:00"),
    end: phuketTimestamp(SEASON.at(-1)!, "24:00") + 60 * MINUTE,
  });
}

/** Number of free starts on each season date. */
export function freeDays(program: ProgramId, busy: BusyInterval[], now: number) {
  return Object.fromEntries(
    SEASON.map((date) => [date, freeTimes(date, program, busy, now).length]),
  ) as Record<string, number>;
}

/** The current date in Phuket as yyyy-mm-dd. */
export function phuketToday(now: number) {
  return new Date(now + 7 * 60 * MINUTE).toISOString().slice(0, 10);
}

/* ---------- Groups of start times shown as tabs ---------- */

export type TimePeriod = { id: string; name: string; from: string; until: string };

const DAY_PERIODS: TimePeriod[] = [
  { id: "morning", name: "Утро", from: "00:00", until: "12:00" },
  { id: "day", name: "День", from: "12:00", until: "17:00" },
  { id: "evening", name: "Вечер", from: "17:00", until: MIDNIGHT },
];

/** On 31 December the tabs follow the price bands, and the midnight visit closes the day. */
const EVE_PERIODS: TimePeriod[] = [
  { id: "day", name: "День", from: "00:00", until: EVE_EVENING_FROM },
  { id: "evening", name: "Вечер", from: EVE_EVENING_FROM, until: EVE_LATE_FROM },
  { id: "late", name: "Поздний вечер", from: EVE_LATE_FROM, until: MIDNIGHT },
  { id: "midnight", name: "Полночь", from: MIDNIGHT, until: "24:30" },
];

export function timePeriods(date: string) {
  return date === NEW_YEAR_EVE ? EVE_PERIODS : DAY_PERIODS;
}

export function inPeriod(time: string, period: TimePeriod) {
  return time >= period.from && time < period.until;
}

/* ---------- Russian labels shared by the page, the ticket and Telegram ---------- */

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

export function dayParts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    day: d.getUTCDate(),
    weekday: WEEKDAYS[d.getUTCDay()]!,
    /** 0 for Monday through 6 for Sunday. */
    column: (d.getUTCDay() + 6) % 7,
    month: MONTHS[d.getUTCMonth()]!,
    monthShort: MONTHS_SHORT[d.getUTCMonth()]!,
    year: d.getUTCFullYear(),
  };
}

/** "чт, 31 декабря" */
export function formatDay(iso: string) {
  const { day, weekday, month } = dayParts(iso);
  return `${weekday}, ${day} ${month}`;
}

/** "24:00" is shown as "00:00". */
export function formatTime(time: string) {
  return time === MIDNIGHT ? "00:00" : time;
}

/** The visit in words, with the New Year midnight spelled out so nobody reads it as another night. */
export function describeVisit(date: string, time: string | null) {
  const slot = time ? normalizeSlot(date, time) : { date, time };
  if (slot.date === NEW_YEAR_EVE && slot.time === MIDNIGHT) {
    return { day: "Ночь с 31 декабря на 1 января", time: "00:00", midnight: true };
  }
  return {
    day: formatDay(slot.date),
    time: slot.time ? formatTime(slot.time) : null,
    midnight: false,
  };
}
