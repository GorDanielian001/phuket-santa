import { useEffect, useState } from "react";
import { AVAILABILITY_ENDPOINT, type Availability } from "./booking";
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
