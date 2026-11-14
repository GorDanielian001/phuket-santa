export type ProgramId = "express" | "khorovod" | "vip";
export type ExtraId = "gifts" | "photographer" | "letter";
export type KidsOption = 1 | 2 | 3 | 4 | 5; // 5 means "5+"
export type VenueId = "villa" | "condo" | "outdoor";

export const PROGRAM_INFO = {
  express: { title: "Экспресс-чудо", minutes: 15 },
  khorovod: { title: "Тропический хоровод", minutes: 30 },
  vip: { title: "VIP-Шоу на вилле", minutes: 60 },
} as const satisfies Record<ProgramId, { title: string; minutes: number }>;

export const VENUE_LABELS = {
  villa: "Вилла / Дом",
  condo: "Кондоминиум / Отель",
  outdoor: "Ресторан / Пляж / Яхта",
} as const satisfies Record<VenueId, string>;

export const NEW_YEAR_EVE = "2026-12-31";
export const NEW_YEAR_DAY = "2027-01-01";
/**
 * The New Year midnight visit belongs to 31 December and is stored as "24:00", the end of that
 * day. It is the same moment as 1 January 00:00 and is shown to people as "00:00".
 */
export const MIDNIGHT = "24:00";
/** 31 December price bands start at these times. */
export const EVE_EVENING_FROM = "17:00";
export const EVE_LATE_FROM = "21:00";

const PROGRAM_PRICES = {
  regular: { express: 8_000, khorovod: 10_500, vip: 16_000 },
  december31Day: { express: 10_000, khorovod: 13_000, vip: 19_000 },
  december31Evening: { express: 13_000, khorovod: 17_000, vip: 24_000 },
  december31Late: { express: 16_000, khorovod: 20_000, vip: 29_000 },
} satisfies Record<string, Record<ProgramId, number>>;

export const ADD_ON_PRICES = {
  manyKidsSurcharge: 500,
  transferFee: 300,
  extras: { giftPerChild: 800, photographer: 2500, letter: 500 },
};

export function programPrice(program: ProgramId, date: string | null, time: string | null) {
  if (date !== NEW_YEAR_EVE) return PROGRAM_PRICES.regular[program];
  if (time === MIDNIGHT) {
    return program === "vip" ? null : PROGRAM_PRICES.december31Late[program] * 2;
  }
  if (time && time >= EVE_LATE_FROM) return PROGRAM_PRICES.december31Late[program];
  if (time && time >= EVE_EVENING_FROM) return PROGRAM_PRICES.december31Evening[program];
  return PROGRAM_PRICES.december31Day[program];
}

export const DISTRICTS: { id: string; name: string; remote: boolean }[] = [
  { id: "bangtao", name: "Банг Тао / Лагуна", remote: false },
  { id: "surin", name: "Сурин", remote: false },
  { id: "kamala", name: "Камала", remote: false },
  { id: "patong", name: "Патонг", remote: false },
  { id: "karon", name: "Карон", remote: false },
  { id: "kata", name: "Ката", remote: false },
  { id: "rawai", name: "Раваи / Най Харн", remote: true },
  { id: "town", name: "Пхукет Таун", remote: true },
  { id: "panwa", name: "Панва", remote: true },
];

/** Season dates: 20 Dec 2026 – 10 Jan 2027, as ISO yyyy-mm-dd strings. */
export function seasonDates(): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(2026, 11, 20));
  const end = Date.UTC(2027, 0, 10);
  while (d.getTime() <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export interface Selection {
  date: string | null;
  time: string | null;
  program: ProgramId | null;
  kids: KidsOption;
  venue: VenueId | null;
  district: string | null;
  extras: Record<ExtraId, boolean>;
}

export interface Line {
  label: string;
  amount: number;
}

export function calculate(sel: Selection) {
  const p = ADD_ON_PRICES;
  const lines: Line[] = [];
  const base = sel.program ? programPrice(sel.program, sel.date, sel.time) : null;
  if (base !== null) lines.push({ label: "program", amount: base });
  if (sel.kids >= 4) lines.push({ label: "manyKids", amount: p.manyKidsSurcharge });
  const district = DISTRICTS.find((d) => d.id === sel.district);
  if (district?.remote) lines.push({ label: "transfer", amount: p.transferFee });
  if (sel.extras.gifts) lines.push({ label: "gifts", amount: p.extras.giftPerChild * sel.kids });
  if (sel.extras.photographer) lines.push({ label: "photographer", amount: p.extras.photographer });
  if (sel.extras.letter) lines.push({ label: "letter", amount: p.extras.letter });

  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) };
}

export function formatTHB(n: number) {
  return `${n.toLocaleString("ru-RU")} ฿`;
}
