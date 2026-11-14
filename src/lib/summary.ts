import { DISTRICTS, PROGRAM_INFO, VENUE_LABELS, calculate, type Selection } from "./pricing";
import { dayParts, describeVisit } from "./schedule";

export type Detail = { k: string; v: string; wide?: boolean };

/** "31 дек · 21:00" for tight spaces such as the mobile bar. */
export function shortVisit(sel: Selection) {
  if (!sel.date) return null;
  const visit = describeVisit(sel.date, sel.time);
  if (visit.midnight) return "Новогодняя ночь · 00:00";
  const { day, monthShort } = dayParts(sel.date);
  return visit.time ? `${day} ${monthShort} · ${visit.time}` : `${day} ${monthShort}`;
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
  const rows = r.lines.map((l) => ({ label: label[l.label] ?? l.label, amount: l.amount }));

  const visit = sel.date ? describeVisit(sel.date, sel.time) : null;
  const when = visit
    ? visit.time
      ? `${visit.day} · ${visit.time}${visit.midnight ? ", под бой курантов" : ""}`
      : `${visit.day} · время не выбрано`
    : "Дата не выбрана";

  const details: Detail[] = [
    { k: "Когда", v: when, wide: true },
    { k: "Детей", v: kids },
    { k: "Место", v: sel.venue ? VENUE_LABELS[sel.venue] : "—" },
    { k: "Район", v: district?.name ?? "—", wide: true },
  ];
  return { rows, details, total: r.total };
}
