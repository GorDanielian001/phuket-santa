import { useEffect, useState } from "react";

// New Year 2027 at midnight Phuket time (UTC+7)
const TARGET = Date.parse("2027-01-01T00:00:00+07:00");

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const p = now === null ? null : parts(TARGET - now);
  const cells: [string, number | undefined][] = [
    ["Дней", p?.days],
    ["Часов", p?.hours],
    ["Минут", p?.minutes],
    ["Секунд", p?.seconds],
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        До новогоднего чуда осталось
      </p>
      <div className="flex items-center gap-2 sm:gap-3">
        {cells.map(([label, v], i) => (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="glass flex w-16 flex-col items-center rounded-2xl px-2 py-2 sm:w-20">
              <span className="font-display text-3xl font-semibold tabular-nums text-gold sm:text-4xl">
                {v === undefined ? "--" : String(v).padStart(2, "0")}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
                {label}
              </span>
            </div>
            {i < cells.length - 1 && <span className="text-gold/60">•</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
