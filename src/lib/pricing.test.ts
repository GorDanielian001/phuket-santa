import { describe, expect, it } from "vitest";
import { calculate, programPrice, seasonDates, type Selection } from "./pricing";

const base: Selection = {
  date: "2026-12-25",
  time: "12:00",
  program: "khorovod",
  kids: 2,
  venue: "villa",
  district: "kamala",
  extras: { gifts: false, photographer: false, letter: false },
};
const calc = (s: Partial<Selection>) => calculate({ ...base, ...s }).total;

describe("pricing", () => {
  it("charges the agreed regular prices in baht", () => {
    expect(calc({ program: "express" })).toBe(8000);
    expect(calc({ program: "khorovod" })).toBe(10500);
    expect(calc({ program: "vip" })).toBe(16000);
  });
  it("keeps the regular price on evenings and on 1 January after midnight", () => {
    expect(calc({ time: "22:00" })).toBe(10500);
    expect(calc({ date: "2027-01-01", time: "10:00" })).toBe(10500);
  });
  it("4 or 5+ kids add 500 THB", () => {
    expect(calc({ kids: 3 })).toBe(10500);
    expect(calc({ kids: 4 })).toBe(11000);
    expect(calc({ kids: 5 })).toBe(11000);
  });
  it("gifts cost 400 THB per child", () => {
    expect(calc({ kids: 3, extras: { gifts: true, photographer: false, letter: false } })).toBe(
      11700,
    );
  });
  it("photographer +2500, letter +500", () => {
    expect(calc({ extras: { gifts: false, photographer: true, letter: true } })).toBe(13500);
  });
  it("remote district adds 300 THB transfer", () => {
    expect(calc({ district: "panwa" })).toBe(10800);
  });
  it("sets all 31 December prices by start time", () => {
    const date = "2026-12-31";
    const pricesAt = (time: string) => [
      programPrice("express", date, time),
      programPrice("khorovod", date, time),
      programPrice("vip", date, time),
    ];
    expect(pricesAt("16:30")).toEqual([10000, 13000, 19000]);
    expect(pricesAt("17:00")).toEqual([13000, 17000, 24000]);
    expect(pricesAt("20:30")).toEqual([13000, 17000, 24000]);
    expect(pricesAt("21:00")).toEqual([16000, 20000, 29000]);
    expect(pricesAt("23:00")).toEqual([16000, 20000, 29000]);
  });

  it("doubles only the program rate at midnight and excludes the hour program", () => {
    const date = "2026-12-31";
    expect(programPrice("express", date, "24:00")).toBe(32000);
    expect(programPrice("khorovod", date, "24:00")).toBe(40000);
    expect(programPrice("vip", date, "24:00")).toBeNull();
    expect(calc({ date, time: "24:00", district: "panwa" })).toBe(40300);
  });
  it("keeps the regular price on the morning of 1 January", () => {
    expect(programPrice("khorovod", "2027-01-01", "10:00")).toBe(10500);
  });
  it("season runs 20 Dec to 10 Jan", () => {
    const d = seasonDates();
    expect(d[0]).toBe("2026-12-20");
    expect(d.at(-1)).toBe("2027-01-10");
    expect(d).toHaveLength(22);
  });
});
