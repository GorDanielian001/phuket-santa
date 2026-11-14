import { phuketTimestamp } from "@/lib/schedule";
import { MIDNIGHT, NEW_YEAR_EVE, seasonDates } from "@/lib/pricing";
import { useNow } from "@/lib/use-now";

// New Year 2027 at midnight Phuket time (UTC+7)
const TARGET = phuketTimestamp(NEW_YEAR_EVE, MIDNIGHT);
const SEASON_END = phuketTimestamp(seasonDates().at(-1)!, "24:00");

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function plural(n: number, [one, few, many]: [string, string, string]) {
  const tens = n % 100;
  const last = n % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function Countdown() {
  const now = useNow(1000);

  if (now !== null && now >= TARGET) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-2 text-center">
        <p className="font-display text-3xl font-semibold text-gold sm:text-4xl">
          С Новым 2027 годом!
        </p>
        <p className="text-sm text-muted-foreground">
          {now < SEASON_END
            ? "Праздник продолжается: принимаем заявки до 10 января"
            : "Сезон завершён. До встречи в декабре!"}
        </p>
      </div>
    );
  }

  const p = now === null ? null : parts(TARGET - now);
  const cells: [[string, string, string], number | undefined][] = [
    [["день", "дня", "дней"], p?.days],
    [["час", "часа", "часов"], p?.hours],
    [["минута", "минуты", "минут"], p?.minutes],
    [["секунда", "секунды", "секунд"], p?.seconds],
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground sm:text-xs">
        До Нового года на Пхукете
      </p>
      <div className="flex items-center gap-1.5 sm:gap-3" role="timer" aria-live="off">
        {cells.map(([forms, v], i) => (
          <div key={forms[2]} className="flex items-center gap-1.5 sm:gap-3">
            <div className="glass flex w-[4.25rem] flex-col items-center rounded-2xl px-1 py-2 sm:w-20">
              <span className="font-display text-3xl font-semibold leading-none tabular-nums text-gold sm:text-4xl">
                {v === undefined ? "--" : String(v).padStart(2, "0")}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                {v === undefined ? forms[2] : plural(v, forms)}
              </span>
            </div>
            {i < cells.length - 1 && (
              <span aria-hidden className="font-display text-2xl text-gold/40 sm:text-3xl">
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
