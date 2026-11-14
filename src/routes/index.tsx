import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Particles, Bokeh } from "@/components/magic/Particles";
import { Garland } from "@/components/magic/Garland";
import { Countdown } from "@/components/magic/Countdown";
import { Hero } from "@/components/magic/Hero";
import { Calculator } from "@/components/magic/Calculator";
import { GoldenTicket, MobileBar } from "@/components/magic/Ticket";
import { BookingDialog } from "@/components/magic/BookingDialog";
import { calculate, type Selection } from "@/lib/pricing";
import { useAvailability } from "@/lib/use-availability";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Дед Мороз и Снегурочка на Пхукете — калькулятор заказа" },
      {
        name: "description",
        content:
          "Закажите Деда Мороза, Снегурочку и детских аниматоров на виллу на Пхукете. Рассчитайте стоимость поздравления в батах за 20 секунд.",
      },
      { property: "og:title", content: "Новогоднее чудо прямо на вашу виллу — Пхукет 2026/2027" },
      {
        property: "og:description",
        content:
          "Дед Мороз и Снегурочка на Пхукете: программы от 15 минут до VIP-шоу. Мгновенный расчёт стоимости.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const INITIAL: Selection = {
  date: null,
  time: null,
  program: "khorovod",
  kids: 2,
  venue: null,
  district: null,
  extras: { gifts: false, photographer: false, letter: false },
};

function Page() {
  const [sel, setSel] = useState<Selection>(INITIAL);
  const [booking, setBooking] = useState<Selection | null>(null);
  const availability = useAvailability(sel.date, sel.program);
  const total = calculate(sel).total;

  const refreshSlots = () => {
    setSel((previous) => ({ ...previous, time: null }));
    availability.retry();
  };

  const book = () => {
    const missing = [
      !sel.date && "дату",
      !sel.time && "время",
      !sel.program && "программу",
      !sel.venue && "место",
      !sel.district && "район",
    ].filter(Boolean);
    if (missing.length) {
      toast("Почти готово ✨", { description: `Осталось выбрать: ${missing.join(", ")}` });
      document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (availability.status !== "ready" || !sel.time || !availability.times.includes(sel.time)) {
      toast.error("Выберите свободное время визита.");
      document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBooking(sel);
  };

  return (
    <div className="relative min-h-screen overflow-x-clip pb-28 lg:pb-0">
      <Bokeh />
      <Particles />

      <div className="relative z-10">
        <Garland />
        <div className="px-4 pt-2">
          <Countdown />
        </div>

        <Hero />

        <main id="calculator" className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-16 sm:px-6">
          <div className="mb-8 text-center lg:text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Калькулятор чуда</p>
            <h2 className="mt-2 text-4xl font-semibold sm:text-5xl">Соберите свой праздник</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              <Calculator
                sel={sel}
                onChange={setSel}
                times={availability.times}
                timeStatus={availability.status}
                onRetry={availability.retry}
              />
            </div>
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <GoldenTicket sel={sel} onBook={book} />
              </div>
            </div>
          </div>
        </main>

        <footer className="mx-auto flex max-w-6xl flex-col items-center gap-3 border-t border-gold/10 px-4 py-10 text-center text-sm text-muted-foreground">
          <p className="font-display text-xl text-gold-soft">
            Волшебники Пхукета · С Новым 2027 годом!
          </p>
          <p>Банг Тао · Камала · Патонг · Ката · Раваи и весь остров</p>
        </footer>
      </div>

      <MobileBar total={total} onBook={book} />
      <BookingDialog
        selection={booking}
        onClose={() => setBooking(null)}
        onAccepted={refreshSlots}
        onSlotUnavailable={() => {
          setBooking(null);
          refreshSlots();
          toast.error("Выбранное время уже недоступно. Выберите другое.");
          document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </div>
  );
}
