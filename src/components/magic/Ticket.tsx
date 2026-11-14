import { useEffect, useState } from "react";
import { Sparkles, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTHB, type Selection } from "@/lib/pricing";
import { shortVisit, summarize, type Detail } from "@/lib/summary";
import { cn } from "@/lib/utils";

export function TicketDetails({ details, className }: { details: Detail[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-3 text-sm", className)}>
      {details.map((d) => (
        <div key={d.k} className={cn(d.wide && "col-span-2")}>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{d.k}</dt>
          <dd className="mt-0.5 font-medium leading-snug first-letter:uppercase">{d.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GoldenTicket({ sel, onBook }: { sel: Selection; onBook: () => void }) {
  const { rows, details, total } = summarize(sel);
  return (
    <aside className="glass bg-ticket ticket-frame overflow-hidden rounded-3xl">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold-soft">
            <TicketIcon className="h-4 w-4 text-gold" /> Золотой билет
          </span>
          <span className="font-display text-sm text-muted-foreground">№ 2027</span>
        </div>
        <h3 className="mt-2 text-3xl font-semibold">Ваш праздник</h3>

        <TicketDetails details={details} className="mt-5" />

        <ul className="mt-5 space-y-2 border-t border-gold/10 pt-4 text-sm">
          {rows.length === 0 && (
            <li className="text-muted-foreground">Выберите программу, чтобы увидеть расчёт</li>
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

/** True once the calculator has scrolled into view, so the bar does not cover the first screen. */
function useCalculatorReached() {
  const [reached, setReached] = useState(false);
  useEffect(() => {
    const target = document.getElementById("calculator");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setReached(entry.isIntersecting || entry.boundingClientRect.top < 0);
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return reached;
}

export function MobileBar({
  sel,
  total,
  onBook,
}: {
  sel: Selection;
  total: number;
  onBook: () => void;
}) {
  const visible = useCalculatorReached();
  const when = shortVisit(sel);
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 p-3 transition-[transform,opacity] duration-500 ease-out lg:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="mobile-bar flex items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
            {when ?? "Итого"}
          </p>
          <p
            key={total}
            className="fade-up font-display text-2xl font-bold leading-none text-gold tabular-nums"
          >
            {formatTHB(total)}
          </p>
        </div>
        <Button variant="gold" className="h-12 shrink-0 px-5" onClick={onBook}>
          Забронировать <Sparkles />
        </Button>
      </div>
    </div>
  );
}
