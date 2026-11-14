import { useEffect, useState } from "react";
import {
  AVAILABILITY_ENDPOINT,
  CALENDAR_ENDPOINT,
  type Availability,
  type CalendarAvailability,
} from "./booking";
import type { ProgramId } from "./pricing";

type Result = { key: string; status: "ready" | "error"; times: string[] };

export function useAvailability(date: string | null, program: ProgramId | null) {
  const [result, setResult] = useState<Result | null>(null);
  const [revision, setRevision] = useState(0);
  const key = date && program ? `${date}/${program}/${revision}` : null;

  useEffect(() => {
    if (!key || !date || !program) return;
    const controller = new AbortController();
    let timer: number | undefined;
    const query = new URLSearchParams({ date, program });

    async function refresh() {
      try {
        const response = await fetch(`${AVAILABILITY_ENDPOINT}?${query}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        });
        if (!response.ok) throw new Error("Availability request failed");
        const { times } = (await response.json()) as Availability;
        if (!Array.isArray(times)) throw new Error("Invalid availability response");
        if (!controller.signal.aborted && key) setResult({ key, status: "ready", times });
      } catch {
        if (!controller.signal.aborted && key) setResult({ key, status: "error", times: [] });
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(() => void refresh(), 20_000);
      }
    }

    void refresh();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [date, program, key]);

  const current = key && result?.key === key ? result : null;
  return {
    status: current?.status ?? (key ? "loading" : "idle"),
    times: current?.times ?? [],
    retry: () => setRevision((value) => value + 1),
  } as const;
}

/**
 * Free starts per season date for the chosen program, refreshed every minute. Keeps the last
 * answer while a new one loads so sold-out marks do not flicker; null until the first answer.
 */
export function useCalendar(program: ProgramId | null) {
  const [days, setDays] = useState<Record<string, number> | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!program) return;
    const controller = new AbortController();
    let timer: number | undefined;
    const query = new URLSearchParams({ program });

    async function refresh() {
      try {
        const response = await fetch(`${CALENDAR_ENDPOINT}?${query}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        });
        if (!response.ok) throw new Error("Calendar request failed");
        const result = (await response.json()) as CalendarAvailability;
        if (!result.days || typeof result.days !== "object") throw new Error("Invalid calendar");
        if (!controller.signal.aborted) setDays(result.days);
      } catch {
        // Without an answer every date stays selectable; times are still checked per date.
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(() => void refresh(), 60_000);
      }
    }

    void refresh();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [program, revision]);

  return { days, retry: () => setRevision((value) => value + 1) } as const;
}
