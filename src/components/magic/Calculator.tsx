import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
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
  PROGRAM_INFO,
  programPrice,
  VENUE_LABELS,
  type ExtraId,
  type KidsOption,
  type ProgramId,
  type Selection,
  type VenueId,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { VisitWhen, type TimeStatus } from "./VisitWhen";

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
  days,
}: {
  sel: Selection;
  onChange: (selection: Selection) => void;
  times: string[];
  timeStatus: TimeStatus;
  onRetry: () => void;
  days: Record<string, number> | null;
}) {
  const set = <K extends keyof Selection>(k: K, v: Selection[K]) => onChange({ ...sel, [k]: v });
  const setExtra = (k: ExtraId, v: boolean) =>
    onChange({ ...sel, extras: { ...sel.extras, [k]: v } });
  const kidsCount = sel.kids;

  const extras: {
    id: ExtraId;
    title: string;
    note: string;
    price: string;
    icon: typeof Gift;
  }[] = [
    {
      id: "gifts",
      title: "Сладкие подарки",
      note: "Новогодний сундучок каждому ребёнку",
      price: `+${formatTHB(prices.extras.giftPerChild)} × ${kidsCount === 5 ? "5+" : kidsCount} = ${formatTHB(prices.extras.giftPerChild * kidsCount)}`,
      icon: Gift,
    },
    {
      id: "photographer",
      title: "Фотограф",
      note: "Профессиональная съёмка праздника",
      price: `+${formatTHB(prices.extras.photographer)}`,
      icon: Camera,
    },
    {
      id: "letter",
      title: "Письмо от Деда Мороза",
      note: "С сургучной печатью",
      price: `+${formatTHB(prices.extras.letter)}`,
      icon: MailOpen,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Step n={1} title="Когда встречаемся?" icon={<CalendarDays className="h-6 w-6" />}>
        <VisitWhen
          sel={sel}
          onChange={onChange}
          times={times}
          timeStatus={timeStatus}
          onRetry={onRetry}
          days={days}
        />
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
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/[0.06]">
                  <Icon className="h-6 w-6 text-gold" />
                </span>
                <div>
                  <h3 className="text-2xl font-semibold leading-tight">{title}</h3>
                  <p className="text-sm text-gold-soft">{minutes} минут</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                {price === null ? (
                  <p className="mt-auto pt-2 text-sm font-medium text-muted-foreground">
                    Недоступно в полночь
                  </p>
                ) : (
                  <p className="mt-auto pt-2 font-display text-3xl font-bold text-gold">
                    {formatTHB(price)}
                  </p>
                )}
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
                className="choice flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5 sm:gap-4"
              >
                <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.06] sm:flex">
                  <Icon className="h-5 w-5 text-gold" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{e.title}</span>
                  <span className="block text-sm text-muted-foreground">{e.note}</span>
                  <span className="mt-0.5 block text-sm tabular-nums text-gold-soft">
                    {e.price}
                  </span>
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
