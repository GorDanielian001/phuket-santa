import { useState, type ReactNode } from "react";
import { Clock, MoonStar, Sparkles } from "lucide-react";
import {
  formatTHB,
  MIDNIGHT,
  NEW_YEAR_DAY,
  NEW_YEAR_EVE,
  programPrice,
  seasonDates,
  type Selection,
} from "@/lib/pricing";
import {
  dayParts,
  formatTime,
  inPeriod,
  isBookableStart,
  MIN_LEAD_MINUTES,
  offeredTimes,
  phuketTimestamp,
  phuketToday,
  timePeriods,
} from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const DATES = seasonDates();
const WEEK = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const HOLIDAYS = new Set([NEW_YEAR_EVE, NEW_YEAR_DAY]);

/** Days of the week before the season starts, so the first row lines up under its weekday. */
const LEAD_COUNT = dayParts(DATES[0]!).column;
const LEADING = Array.from({ length: LEAD_COUNT }, (_, i) => {
  const d = new Date(`${DATES[0]}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (LEAD_COUNT - i));
  return d.getUTCDate();
});

export type TimeStatus = "idle" | "loading" | "ready" | "error";

function SeasonCalendar({
  selected,
  days,
  today,
  onSelect,
}: {
  selected: string | null;
  days: Record<string, number> | null;
  today: string | null;
  onSelect: (iso: string) => void;
}) {
  const anySoldOut = DATES.some((iso) => days?.[iso] === 0 && (!today || iso >= today));
  return (
    <div className="rounded-2xl border border-gold/15 bg-background/25 p-2.5 sm:p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <p className="font-display text-lg font-semibold text-gold-soft sm:text-xl">
          Декабрь 2026 <span className="text-gold/50">·</span> Январь 2027
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-ruby" /> праздники
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="group" aria-label="Дата визита">
        {WEEK.map((name, i) => (
          <span
            key={name}
            aria-hidden
            className={cn(
              "pb-1 text-center text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]",
              i >= 5 ? "text-gold-soft/80" : "text-muted-foreground/80",
            )}
          >
            {name}
          </span>
        ))}
        {LEADING.map((day) => (
          <span
            key={`lead-${day}`}
            aria-hidden
            className="flex h-11 items-center justify-center font-display text-lg text-muted-foreground/25 sm:h-14 sm:text-xl"
          >
            {day}
          </span>
        ))}
        {DATES.map((iso) => {
          const { day, monthShort, month, weekday } = dayParts(iso);
          const past = today !== null && iso < today;
          const soldOut = !past && days?.[iso] === 0;
          const holiday = HOLIDAYS.has(iso);
          const firstOfMonth = iso === DATES[0] || day === 1;
          const state = past ? "время прошло" : soldOut ? "мест нет" : null;
          return (
            <button
              key={iso}
              type="button"
              disabled={past || soldOut}
              aria-pressed={selected === iso}
              aria-label={`${weekday}, ${day} ${month}${state ? `, ${state}` : ""}`}
              data-selected={selected === iso}
              data-tone={holiday ? "ruby" : undefined}
              onClick={() => onSelect(iso)}
              className={cn(
                "choice relative flex h-11 min-w-0 flex-col items-center justify-center rounded-xl leading-none sm:h-14",
                (past || soldOut) && "cursor-not-allowed opacity-35 hover:bg-transparent",
              )}
            >
              <span
                className={cn(
                  "font-display text-lg font-semibold sm:text-2xl",
                  soldOut && "line-through decoration-1",
                )}
              >
                {day}
              </span>
              {firstOfMonth && (
                <span className="mt-0.5 text-[9px] uppercase tracking-wider text-gold-soft/80 sm:text-[10px]">
                  {monthShort}
                </span>
              )}
              {holiday && (
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ruby shadow-[0_0_6px_var(--ruby)]"
                />
              )}
            </button>
          );
        })}
      </div>
      {anySoldOut && (
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Зачёркнутые даты заняты для выбранной программы. Другая программа может поместиться.
        </p>
      )}
    </div>
  );
}

function VisitTimes({
  sel,
  times,
  status,
  period,
  onPeriod,
  onSelect,
  now,
}: {
  sel: Selection;
  times: string[];
  status: TimeStatus;
  period: string | null;
  onPeriod: (id: string) => void;
  onSelect: (time: string) => void;
  now: number | null;
}) {
  if (!sel.date || !sel.program) return null;
  const { date, program } = sel;
  const free = new Set(times);
  const shown = offeredTimes(date, program).filter(
    (time) => now === null || isBookableStart(phuketTimestamp(date, time), now),
  );
  if (!shown.length) {
    return (
      <p className="rounded-2xl border border-gold/15 bg-background/25 px-4 py-5 text-sm text-muted-foreground">
        На эту дату запись уже закрыта. Выберите другой день.
      </p>
    );
  }
  const eve = date === NEW_YEAR_EVE;
  const periods = timePeriods(date)
    .map((p) => ({ ...p, slots: shown.filter((time) => inPeriod(time, p)) }))
    .filter((p) => p.slots.length > 0);
  const current =
    periods.find((p) => p.id === period) ??
    periods.find((p) => sel.time && p.slots.includes(sel.time)) ??
    periods.find((p) => p.slots.some((time) => free.has(time))) ??
    periods[0]!;

  return (
    <div className="rounded-2xl border border-gold/15 bg-background/25 p-2 sm:p-3">
      <div
        role="group"
        aria-label="Часть дня"
        className={cn(
          "grid gap-1.5",
          periods.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
        )}
      >
        {periods.map((p) => {
          const holdsSelection = !!sel.time && p.slots.includes(sel.time);
          const first = p.slots[0]!;
          const last = p.slots.at(-1)!;
          const price = programPrice(program, date, first);
          const hint = eve
            ? price === null
              ? ""
              : formatTHB(price)
            : first === last
              ? formatTime(first)
              : `${formatTime(first)}–${formatTime(last)}`;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={current.id === p.id}
              onClick={() => onPeriod(p.id)}
              className="relative flex min-h-12 flex-col items-center justify-center rounded-xl border border-transparent px-2 py-1.5 text-center transition-colors hover:bg-gold/5 focus-visible:outline-2 focus-visible:outline-gold aria-pressed:border-gold/35 aria-pressed:bg-gold/12"
            >
              <span
                className={cn(
                  "flex items-center gap-1 text-sm font-semibold",
                  current.id === p.id ? "text-gold-soft" : "text-foreground/85",
                )}
              >
                {p.id === "midnight" && <MoonStar className="h-3.5 w-3.5" />}
                {p.name}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{hint}</span>
              {holdsSelection && (
                <span
                  aria-label="здесь выбранное время"
                  className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_var(--gold)]"
                />
              )}
            </button>
          );
        })}
      </div>
      <div
        role="group"
        aria-label={`Время: ${current.name}`}
        aria-busy={status === "loading"}
        className="mt-2 grid grid-cols-4 gap-1.5 border-t border-gold/10 pt-2.5 sm:grid-cols-6 sm:gap-2"
      >
        {current.slots.map((time) => {
          const midnight = time === MIDNIGHT;
          const ready = status === "ready";
          const taken = ready && !free.has(time);
          const selected = sel.time === time && !taken;
          return (
            <button
              key={time}
              type="button"
              disabled={!ready || taken}
              aria-pressed={selected}
              data-selected={selected}
              data-tone={midnight ? "ruby" : undefined}
              onClick={() => onSelect(time)}
              className={cn(
                "choice flex min-h-11 flex-col items-center justify-center rounded-xl px-1 py-1.5 leading-tight",
                midnight && "col-span-full min-h-14 flex-row gap-3 px-4",
                status === "loading" && "animate-pulse cursor-wait opacity-50",
                status === "error" && "opacity-40",
                taken && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  midnight && "font-display text-2xl",
                  taken && "line-through decoration-1",
                )}
              >
                {formatTime(time)}
              </span>
              {midnight ? (
                <span className="text-left text-xs leading-snug text-gold-soft">
                  Под бой курантов
                  <span className="block text-muted-foreground">
                    в ночь с 31 декабря на 1 января
                  </span>
                </span>
              ) : (
                taken && <span className="text-[10px] text-muted-foreground">занято</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="fade-up mt-3 flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm leading-relaxed text-gold-soft">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <div>{children}</div>
    </div>
  );
}

export function VisitWhen({
  sel,
  onChange,
  times,
  timeStatus,
  onRetry,
  days,
}: {
  sel: Selection;
  onChange: (selection: Selection) => void;
  times: string[];
  timeStatus: TimeStatus;
  onRetry: () => void;
  days: Record<string, number> | null;
}) {
  const now = useNow();
  const [period, setPeriod] = useState<string | null>(null);
  const today = now === null ? null : phuketToday(now);
  const selectDate = (iso: string, nextPeriod: string | null = null) => {
    setPeriod(nextPeriod);
    onChange({ ...sel, date: iso, time: iso === sel.date ? sel.time : null });
  };
  const midnightOffered =
    !!sel.program && programPrice(sel.program, NEW_YEAR_EVE, MIDNIGHT) !== null;

  return (
    <>
      <SeasonCalendar selected={sel.date} days={days} today={today} onSelect={selectDate} />

      {sel.date === NEW_YEAR_EVE && (
        <Note>
          31 декабря цена зависит от времени начала.{" "}
          {midnightOffered ? (
            <>
              Визит в полночь, в ночь на 1 января, ищите на вкладке{" "}
              <button
                type="button"
                onClick={() => setPeriod("midnight")}
                className="font-semibold text-gold underline decoration-gold/50 underline-offset-4 hover:decoration-gold"
              >
                «Полночь»
              </button>
              .
            </>
          ) : (
            "Визит в полночь доступен для программ на 15 и 30 минут."
          )}
        </Note>
      )}
      {sel.date === NEW_YEAR_DAY && (
        <Note>
          Ищете визит в новогоднюю полночь? Он в ночь с 31 декабря на 1 января.{" "}
          <button
            type="button"
            onClick={() => selectDate(NEW_YEAR_EVE, "midnight")}
            className="font-semibold text-gold underline decoration-gold/50 underline-offset-4 hover:decoration-gold"
          >
            Показать полночь
          </button>
        </Note>
      )}

      <p className="mb-3 mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" /> Время начала по Пхукету
      </p>
      <div aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
        {timeStatus === "idle" && "Сначала выберите дату."}
        {timeStatus === "error" && (
          <button type="button" className="mb-3 text-gold underline" onClick={onRetry}>
            Не удалось загрузить время. Повторить
          </button>
        )}
        {timeStatus === "ready" && !times.length && (
          <p className="mb-3">На эту дату для выбранной программы свободного времени нет.</p>
        )}
      </div>
      <VisitTimes
        sel={sel}
        times={times}
        status={timeStatus}
        period={period}
        onPeriod={setPeriod}
        onSelect={(time) => onChange({ ...sel, time })}
        now={now}
      />
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground/80">
        Запись открыта не позднее чем за {MIN_LEAD_MINUTES / 60} часа до начала. Между визитами мы
        закладываем время на дорогу, поэтому соседние слоты могут быть заняты.
      </p>
    </>
  );
}
