import { Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-ded-moroz-phuket.jpg";

const PERKS = ["Профессиональные актёры", "Шикарные костюмы", "Восторг детей"];

export function Hero() {
  return (
    <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pt-14">
      <div className="fade-up text-center lg:text-left">
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-gold-soft sm:text-sm">
          <span aria-hidden>🎅</span> Главные волшебники Пхукета · Сезон 2026/2027
        </span>
        <h1 className="mt-6 text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">
          <span className="text-gold-shimmer">Новогоднее чудо</span>
          <br />
          прямо на вашу{"\u00a0"}виллу
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
          Рассчитайте стоимость поздравления от Деда Мороза и Снегурочки за 20 секунд
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
          <Button asChild variant="gold" size="xl" className="cta-pulse">
            <a href="#calculator">
              <Sparkles /> Рассчитать стоимость
            </a>
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} aria-hidden className="h-4 w-4 fill-gold text-gold" />
            ))}
            <span className="ml-2">300+ счастливых семей</span>
          </div>
        </div>
      </div>

      <div className="fade-up relative mx-auto w-full max-w-md [animation-delay:150ms]">
        <div className="glass hero-frame relative overflow-hidden rounded-[2rem] p-2">
          <img
            src={heroImg}
            alt="Дед Мороз и Снегурочка у ёлки на вилле в Пхукете"
            width={1024}
            height={1280}
            fetchPriority="high"
            className="aspect-[4/5] w-full rounded-[1.6rem] object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-2 bottom-2 h-2/5 rounded-b-[1.6rem] bg-gradient-to-t from-night/90 via-night/40 to-transparent"
          />
          <ul className="absolute inset-x-5 bottom-5 flex flex-wrap justify-center gap-1.5">
            {PERKS.map((perk) => (
              <li
                key={perk}
                className="rounded-full border border-gold/30 bg-night/60 px-3 py-1.5 text-xs font-medium text-ivory backdrop-blur-md sm:text-[13px]"
              >
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
