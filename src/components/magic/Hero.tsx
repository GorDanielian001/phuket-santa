import { Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-ded-moroz-phuket.jpg";

export function Hero() {
  return (
    <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pt-14">
      <div className="fade-up text-center lg:text-left">
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-gold-soft sm:text-sm">
          🎅 Главные волшебники Пхукета • Сезон 2026/2027
        </span>
        <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-gold">Новогоднее чудо</span>
          <br />
          прямо на вашу виллу
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
          Рассчитайте стоимость поздравления от Деда Мороза и Снегурочки за 20 секунд
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
          <Button asChild variant="gold" size="xl">
            <a href="#calculator">
              <Sparkles /> Рассчитать стоимость
            </a>
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-gold text-gold" />
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
            className="aspect-[4/5] w-full rounded-[1.6rem] object-cover"
          />
          <div className="glass-strong absolute inset-x-5 bottom-5 rounded-2xl px-4 py-3 text-center text-xs font-medium leading-relaxed text-ivory sm:text-sm">
            100% восторг для детей • Профессиональные актеры • Шикарные костюмы
          </div>
        </div>
      </div>
    </section>
  );
}
