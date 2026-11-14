import { useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  Clock,
  Crown,
  Gift,
  Camera,
  Home,
  MailOpen,
  MapPin,
  PartyPopper,
  Sailboat,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ADD_ON_PRICES as prices,
  DISTRICTS,
  formatTHB,
  MIDNIGHT,
  NEW_YEAR_DAY,
  NEW_YEAR_EVE,
  PROGRAM_INFO,
  programPrice,
  seasonDates,
  VENUE_LABELS,
  type ExtraId,
  type KidsOption,
  type ProgramId,
  type Selection,
  type VenueId,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const DATES = seasonDates();
const MONTHS = [
  { id: "12", name: "Декабрь", short: "дек" },
  { id: "01", name: "Январь", short: "янв" },
];
const PERIODS = [
  { id: "morning", name: "Утро", start: "06:00", end: "12:00" },
  { id: "day", name: "День", start: "12:00", end: "17:00" },
  { id: "evening", name: "Вечер", start: "17:00", end: "24:00" },
  { id: "midnight", name: "Полночь", start: MIDNIGHT, end: "06:00" },
] as const;

function VisitTimes({
  times,
  sel,
  onSelect,
}: {
  times: string[];
  sel: Selection;
  onSelect: (time: string) => void;
}) {
  const [periodId, setPeriodId] = useState<string | null>(null);
  const periods = PERIODS.map((period) => ({
    ...period,
    slots: times.filter((time) => time >= period.start && time < period.end),
  })).filter((period) => period.slots.length > 0);
  const current =
    periods.find((period) => period.id === periodId) ??
    periods.find((period) => sel.time && period.slots.includes(sel.time)) ??
    periods[0];
  if (!current) return null;

  return (
    <div className="rounded-2xl border border-gold/15 bg-background/25 p-2.5 sm:p-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Часть дня">
        {periods.map((period) => (
          <button
            key={period.id}
            type="button"
            aria-pressed={current.id === period.id}
            onClick={() => setPeriodId(period.id)}
            className="rounded-full border border-transparent px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-gold-soft focus-visible:outline-2 focus-visible:outline-gold aria-pressed:border-gold/30 aria-pressed:bg-gold/15 aria-pressed:text-gold-soft sm:text-sm"
          >
            {period.name}
            {sel.time && period.slots.includes(sel.time) && (
              <span className="ml-1.5 tabular-nums text-gold-soft"> {sel.time}</span>
            )}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label={`Свободное время: ${current.name}`}
        className="mt-2.5 grid grid-cols-4 gap-1.5 border-t border-gold/10 pt-2.5 sm:grid-cols-6 sm:gap-2"
      >
        {current.slots.map((time) => {
          const midnight = time === MIDNIGHT;
          const price = sel.program ? programPrice(sel.program, sel.date, time) : null;
          return (
            <button
              key={time}
              type="button"
              aria-pressed={sel.time === time}
              data-selected={sel.time === time}
              onClick={() => onSelect(time)}
              className={cn(
                "choice flex min-h-10 flex-col items-center justify-center rounded-xl px-1 py-1.5 leading-tight",
                midnight && "col-span-full flex-row flex-wrap gap-x-2.5 px-3",
              )}
            >
              <span className="text-sm font-semibold tabular-nums">{time}</span>
              {midnight && <span className="text-xs text-gold-soft">Под бой курантов</span>}
              {(sel.date === NEW_YEAR_EVE || midnight) && price !== null && (
                <span className="whitespace-nowrap text-[10px] text-gold-soft sm:text-[11px]">
                  {formatTHB(price)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PROGRAMS: {
  id: ProgramId;
  icon: typeof Zap;
  text: string;
  hit?: boolean;
}[] = [
  {
    id: "express",
    icon: Zap,
    text: "Торжественное появление, поздравление, вручение вашего подарка, фото на память.",
  },
  {
    id: "khorovod",
    icon: PartyPopper,
    hit: true,
    text: "Авторские игры, танцы, загадки, фокусы, хоровод, вручение подарков и фотосессия.",
  },
  {
    id: "vip",
    icon: Crown,
    text: "Сказка-квест, шоу мыльных пузырей или крио-элементы, музыка, конкурсы для детей и взрослых, вручение подарков.",
  },
];

const VENUES: { id: VenueId; icon: typeof Home }[] = [
  { id: "villa", icon: Home },
  { id: "condo", icon: Building2 },
  { id: "outdoor", icon: Sailboat },
];

const KIDS: KidsOption[] = [1, 2, 3, 4, 5];

function Step({
  n,
  title,
  icon,
  children,
}: {
  n: number;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass min-w-0 rounded-3xl p-5 sm:p-7">
      <header className="mb-5 flex items-center gap-3">
        <span className="bg-gold-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold text-primary-foreground">
          {n}
        </span>
        <h2 className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
          {title}
          <span className="text-gold">{icon}</span>
        </h2>
      </header>
      {children}
    </section>
  );
}

export function Calculator({
  sel,
  onChange,
  times,
  timeStatus,
  onRetry,
}: {
  sel: Selection;
  onChange: (selection: Selection) => void;
  times: string[];
  timeStatus: "idle" | "loading" | "ready" | "error";
  onRetry: () => void;
}) {
  const set = <K extends keyof Selection>(k: K, v: Selection[K]) => onChange({ ...sel, [k]: v });
  const setExtra = (k: ExtraId, v: boolean) =>
    onChange({ ...sel, extras: { ...sel.extras, [k]: v } });
  const kidsCount = sel.kids;
  const selectDate = (iso: string) =>
    onChange({ ...sel, date: iso, time: iso === sel.date ? sel.time : null });

  const extras: { id: ExtraId; title: string; price: string; icon: typeof Gift }[] = [
    {
      id: "gifts",
      title: "Сладкие новогодние подарки в сундучках",
      price: `+${formatTHB(prices.extras.giftPerChild)} за ребёнка · ${kidsCount === 5 ? "5+" : kidsCount} × = ${formatTHB(prices.extras.giftPerChild * kidsCount)}`,
      icon: Gift,
    },
    {
      id: "photographer",
      title: "Профессиональный фотограф на праздник",
      price: `+${formatTHB(prices.extras.photographer)}`,
      icon: Camera,
    },
    {
      id: "letter",
      title: "Письмо от Деда Мороза с сургучной печатью",
      price: `+${formatTHB(prices.extras.letter)}`,
      icon: MailOpen,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Step n={1} title="Когда встречаемся?" icon={<CalendarDays className="h-6 w-6" />}>
        <p className="mb-3 text-sm text-muted-foreground">Дата визита · 20 декабря — 10 января</p>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 pt-1 sm:-mx-7 sm:px-7 lg:hidden">
          {DATES.map((iso) => {
            const d = new Date(`${iso}T00:00:00Z`);
            const holiday = iso === NEW_YEAR_EVE || iso === NEW_YEAR_DAY;
            return (
              <button
                key={iso}
                type="button"
                data-selected={sel.date === iso}
                data-tone={holiday ? "ruby" : undefined}
                aria-pressed={sel.date === iso}
                onClick={() => selectDate(iso)}
                className="choice relative flex w-16 shrink-0 flex-col items-center rounded-2xl py-3"
              >
                <span className="text-[11px] uppercase text-muted-foreground">
                  {WEEKDAYS[d.getUTCDay()]}
                </span>
                <span className="font-display text-2xl font-semibold">{d.getUTCDate()}</span>
                <span className="text-[11px] text-muted-foreground">
                  {d.getUTCMonth() === 11 ? "дек" : "янв"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="hidden gap-3 lg:grid lg:grid-cols-2">
          {MONTHS.map((month) => (
            <div
              key={month.id}
              className="min-w-0 rounded-2xl border border-gold/15 bg-background/25 p-3"
            >
              <p className="mb-2 px-1 text-sm font-semibold text-gold-soft">{month.name}</p>
              <div className="grid grid-cols-6 gap-1.5">
                {DATES.filter((iso) => iso.slice(5, 7) === month.id).map((iso) => {
                  const d = new Date(`${iso}T00:00:00Z`);
                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-label={`${d.getUTCDate()} ${month.short}`}
                      aria-pressed={sel.date === iso}
                      data-selected={sel.date === iso}
                      data-tone={iso === NEW_YEAR_EVE || iso === NEW_YEAR_DAY ? "ruby" : undefined}
                      onClick={() => selectDate(iso)}
                      className="choice flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 leading-none"
                    >
                      <span className="font-display text-lg font-semibold">{d.getUTCDate()}</span>
                      <span className="text-[9px] uppercase text-muted-foreground">
                        {WEEKDAYS[d.getUTCDay()]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {(sel.date === NEW_YEAR_EVE || sel.date === NEW_YEAR_DAY) && (
          <div className="fade-up glow-gold mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm text-gold-soft">
            <Sparkles className="h-5 w-5 shrink-0 text-gold" />
            {sel.date === NEW_YEAR_EVE ? (
              <span>
                31 декабря цена зависит от времени начала.{" "}
                <button
                  type="button"
                  onClick={() => selectDate(NEW_YEAR_DAY)}
                  className="font-semibold underline"
                >
                  Посмотреть время под бой курантов
                </button>
              </span>
            ) : (
              "Визит под бой курантов начинается в 00:00. Доступны программы на 15 и 30 минут."
            )}
          </div>
        )}

        <p className="mb-3 mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" /> Время визита по Пхукету
        </p>
        <div aria-live="polite" className="text-sm text-muted-foreground">
          {timeStatus === "idle" && "Выберите дату и программу."}
          {timeStatus === "loading" && "Проверяем свободное время…"}
          {timeStatus === "error" && (
            <button type="button" className="text-gold underline" onClick={onRetry}>
              Не удалось загрузить время. Повторить
            </button>
          )}
          {timeStatus === "ready" &&
            !times.length &&
            "На эту дату свободных мест для выбранной программы нет."}
        </div>
        <VisitTimes key={sel.date} times={times} sel={sel} onSelect={(time) => set("time", time)} />
      </Step>

      <Step n={2} title="Программа волшебства" icon={<Wand2 className="h-6 w-6" />}>
        <div className="grid gap-4 md:grid-cols-3">
          {PROGRAMS.map((p) => {
            const Icon = p.icon;
            const { title, minutes } = PROGRAM_INFO[p.id];
            const price = programPrice(p.id, sel.date, sel.time);
            return (
              <button
                key={p.id}
                type="button"
                data-selected={sel.program === p.id}
                disabled={price === null}
                onClick={() =>
                  onChange({ ...sel, program: p.id, time: p.id === sel.program ? sel.time : null })
                }
                className={cn(
                  "choice relative flex flex-col items-start gap-3 rounded-3xl p-5 text-left",
                  p.hit && "md:-translate-y-1",
                  price === null && "cursor-not-allowed opacity-60",
                )}
              >
                {p.hit && (
                  <span className="bg-gold-gradient absolute -top-3 right-4 rounded-full px-3 py-1 text-xs font-bold text-primary-foreground shadow-[var(--glow-gold)]">
                    ★ Хит выбора
                  </span>
                )}
                <span className="glass-strong flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Icon className="h-6 w-6 text-gold" />
                </span>
                <div>
                  <h3 className="text-2xl font-semibold leading-tight">{title}</h3>
                  <p className="text-sm text-gold-soft">{minutes} минут</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                <p className="mt-auto pt-2 font-display text-3xl font-bold text-gold">
                  {price === null ? "В полночь недоступно" : formatTHB(price)}
                </p>
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={3} title="Детали праздника" icon={<Users className="h-6 w-6" />}>
        <p className="mb-3 text-sm text-muted-foreground">Количество детей</p>
        <div className="flex flex-wrap gap-3">
          {KIDS.map((k) => (
            <button
              key={k}
              type="button"
              data-selected={sel.kids === k}
              onClick={() => set("kids", k)}
              className="choice h-14 w-14 rounded-full text-lg font-semibold sm:h-16 sm:w-16"
            >
              {k === 5 ? "5+" : k}
            </button>
          ))}
        </div>
        {sel.kids >= 4 && (
          <p className="fade-up mt-3 text-sm text-gold-soft">
            + {formatTHB(prices.manyKidsSurcharge)} за дополнительный реквизит для большой компании
          </p>
        )}

        <p className="mb-3 mt-6 text-sm text-muted-foreground">Место проведения</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {VENUES.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                data-selected={sel.venue === v.id}
                onClick={() => set("venue", v.id)}
                className="choice flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 text-left font-medium"
              >
                <Icon className="h-5 w-5 shrink-0 text-gold" />
                {VENUE_LABELS[v.id]}
              </button>
            );
          })}
        </div>

        <p className="mb-3 mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" /> Район Пхукета
        </p>
        <Select value={sel.district ?? ""} onValueChange={(v) => set("district", v)}>
          <SelectTrigger className="choice h-14 rounded-2xl px-4 text-base">
            <SelectValue placeholder="Выберите район" />
          </SelectTrigger>
          <SelectContent className="glass-strong rounded-2xl">
            {DISTRICTS.map((d) => (
              <SelectItem key={d.id} value={d.id} className="rounded-xl py-2.5">
                {d.name}
                {d.remote && (
                  <span className="ml-2 text-xs text-gold">
                    +{formatTHB(prices.transferFee)} трансфер
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Step>

      <Step n={4} title="Добавить магии" icon={<Sparkles className="h-6 w-6" />}>
        <div className="flex flex-col gap-3">
          {extras.map((e) => {
            const Icon = e.icon;
            const on = sel.extras[e.id];
            return (
              <label
                key={e.id}
                data-selected={on}
                className="choice flex cursor-pointer items-center gap-4 rounded-2xl px-4 py-4"
              >
                <span className="glass-strong flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5 text-gold" />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{e.title}</span>
                  <span className="block text-sm text-gold-soft">{e.price}</span>
                </span>
                <Switch
                  checked={on}
                  onCheckedChange={(v) => setExtra(e.id, v)}
                  className="h-7 w-12 data-[state=checked]:bg-gold [&>span]:h-6 [&>span]:w-6 [&>span]:data-[state=checked]:translate-x-5"
                />
              </label>
            );
          })}
        </div>
      </Step>
    </div>
  );
}
