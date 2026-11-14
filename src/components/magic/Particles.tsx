import { useEffect, useRef } from "react";
import { FESTIVE } from "@/lib/festive-colors";

type Kind = "spark" | "snow" | "pollen";
interface P {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  phase: number;
  sway: number;
  kind: Kind;
  color: string;
  alpha: number;
}

/** Endless drifting golden sparks, magic pollen and soft snowflakes behind the content. */
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let parts: P[] = [];

    const make = (initial: boolean): P => {
      const roll = Math.random();
      const kind: Kind = roll < 0.4 ? "snow" : roll < 0.8 ? "spark" : "pollen";
      const color =
        kind === "snow"
          ? FESTIVE.snow
          : kind === "spark"
            ? Math.random() < 0.7
              ? FESTIVE.gold
              : FESTIVE.goldSoft
            : Math.random() < 0.5
              ? FESTIVE.amber
              : FESTIVE.emerald;
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : -10,
        r: kind === "snow" ? 1.2 + Math.random() * 2.4 : kind === "spark" ? 0.6 + Math.random() * 1.4 : 0.8 + Math.random() * 1.2,
        vy: kind === "snow" ? 0.25 + Math.random() * 0.5 : kind === "spark" ? 0.35 + Math.random() * 0.7 : 0.1 + Math.random() * 0.25,
        vx: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2,
        sway: 0.3 + Math.random() * 0.9,
        kind,
        color,
        alpha: kind === "snow" ? 0.35 + Math.random() * 0.35 : 0.5 + Math.random() * 0.5,
      };
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(140, (w * h) / 11000) * (reduced ? 0.3 : 1));
      parts = Array.from({ length: count }, () => make(true));
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.phase += 0.012 * p.sway;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.phase) * 0.35 * p.sway;
        if (p.y > h + 10 || p.x < -20 || p.x > w + 20) Object.assign(p, make(false));

        const twinkle = p.kind === "snow" ? 1 : 0.55 + 0.45 * Math.sin(t * 3 + p.phase * 4);
        ctx.globalAlpha = p.alpha * twinkle;
        if (p.kind !== "snow") {
          ctx.shadowBlur = p.kind === "spark" ? 10 : 6;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 4;
          ctx.shadowColor = p.color;
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}

/** Soft blurred garland bokeh behind everything. */
export function Bokeh() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="bokeh bokeh-gold left-[-6rem] top-[8%] h-72 w-72" />
      <div className="bokeh bokeh-amber right-[-4rem] top-[30%] h-80 w-80 [animation-delay:-6s]" />
      <div className="bokeh bokeh-emerald bottom-[5%] left-[20%] h-96 w-96 [animation-delay:-3s]" />
      <div className="bokeh bokeh-ruby right-[15%] bottom-[-6rem] h-72 w-72 [animation-delay:-9s]" />
      <div className="bokeh bokeh-gold left-[45%] top-[-5rem] h-56 w-56 [animation-delay:-12s]" />
    </div>
  );
}
