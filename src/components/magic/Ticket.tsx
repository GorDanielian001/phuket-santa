import { Sparkles, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DISTRICTS,
  MIDNIGHT,
  PROGRAM_INFO,
  VENUE_LABELS,
  calculate,
  formatTHB,
  type Selection,
} from "@/lib/pricing";

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

export function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function summarize(sel: Selection) {
  const r = calculate(sel);
  const program = sel.program ? PROGRAM_INFO[sel.program] : null;
  const district = DISTRICTS.find((d) => d.id === sel.district);
  const kids = sel.kids === 5 ? "5+" : String(sel.kids);
  const label: Record<string, string> = {
    program: program ? `«${program.title}» · ${program.minutes} минут` : "",
    manyKids: "Доп. реквизит для 4+ детей",
    transfer: `Трансфер: ${district?.name ?? ""}`,
    gifts: `Сладкие сундучки × ${kids}`,
    photographer: "Фотограф на праздник",
    letter: "Письмо с сургучной печатью",
  };
  const rows = r.lines.map((l) => ({ label: label[l.label], amount: l.amount }));

  const details = [
    { k: "Дата", v: sel.date ? formatDate(sel.date) : "—" },
    { k: "Время", v: sel.time === MIDNIGHT ? "00:00 · Под бой курантов" : (sel.time ?? "—") },
    { k: "Детей", v: kids },
    { k: "Место", v: sel.venue ? VENUE_LABELS[sel.venue] : "—" },
    { k: "Район", v: district?.name ?? "—" },
  ];
  return { rows, details, total: r.total };
}

export function GoldenTicket({ sel, onBook }: { sel: Selection; onBook: () => void }) {
  const { rows, details, total } = summarize(sel);
  return (
    <aside className="glass bg-ticket overflow-hidden rounded-3xl hero-frame">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold">
            <TicketIcon className="h-4 w-4" /> Золотой билет
          </span>
          <span className="font-display text-sm text-muted-foreground">№ 2027</span>
        </div>
        <h3 className="mt-2 text-3xl font-semibold">Ваш праздник</h3>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {details.map((d) => (
            <div key={d.k}>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{d.k}</dt>
              <dd className="font-medium">{d.v}</dd>
            </div>
          ))}
        </dl>

        <ul className="mt-5 space-y-2 text-sm">
          {rows.length === 0 && (
            <li className="text-muted-foreground">Выберите программу, чтобы увидеть расчёт ✨</li>
          )}
          {rows.map((r) => (
            <li key={r.label} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{formatTHB(r.amount)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="perforation mx-0" />

      <div className="p-6 pt-5">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Итого</p>
        <p key={total} className="fade-up font-display text-5xl font-bold text-gold tabular-nums">
          {formatTHB(total)}
        </p>
        <Button variant="gold" size="xl" className="mt-5 w-full" onClick={onBook}>
          Забронировать чудо <Sparkles />
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Без предоплаты · подтверждаем вручную
        </p>
      </div>
    </aside>
  );
}

export function MobileBar({ total, onBook }: { total: number; onBook: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden">
      <div className="glass-strong flex items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Итого</p>
          <p
            key={total}
            className="fade-up font-display text-2xl font-bold leading-none text-gold tabular-nums"
          >
            {formatTHB(total)}
          </p>
        </div>
        <Button variant="gold" className="h-12 px-5" onClick={onBook}>
          Забронировать чудо ✨
        </Button>
      </div>
    </div>
  );
}
