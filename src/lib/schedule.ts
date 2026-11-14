import {
  MIDNIGHT,
  NEW_YEAR_DAY,
  NEW_YEAR_EVE,
  PROGRAM_INFO,
  seasonDates,
  type ProgramId,
} from "./pricing.ts";

const dates = new Set(seasonDates());
const step = 30;

export function isSeasonDate(date: string) {
  return dates.has(date);
}

export function phuketTimestamp(date: string, time: string) {
  return Date.parse(`${date}T${time}:00+07:00`);
}

export function offeredTimes(date: string, program: ProgramId): string[] {
  if (!isSeasonDate(date)) return [];
  const last = date === NEW_YEAR_EVE ? 23 * 60 : 22 * 60;
  const times = [];
  if (date === NEW_YEAR_DAY && program !== "vip") times.push(MIDNIGHT);
  for (let minute = 10 * 60; minute <= last; minute += step) {
    times.push(
      `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
    );
  }
  return times;
}

export function programInterval(date: string, time: string, program: ProgramId) {
  const start = phuketTimestamp(date, time);
  return { start, end: start + PROGRAM_INFO[program].minutes * 60_000 };
}

export function isProgram(value: unknown): value is ProgramId {
  return typeof value === "string" && Object.hasOwn(PROGRAM_INFO, value);
}
