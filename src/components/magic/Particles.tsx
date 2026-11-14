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
  sprite: HTMLCanvasElement;
  alpha: number;
}

const SPRITE = 32;

/** A soft glowing dot drawn once; per-frame canvas shadows are far too slow on phones. */
function glowSprite(color: string, core: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPRITE;
  const ctx = canvas.getContext("2d")!;
  const c = SPRITE / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, color);
  gradient.addColorStop(core, color);
  gradient.addColorStop(core + 0.12, `${color}66`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE, SPRITE);
  return canvas;
}

/** Drifting golden sparks, magic pollen and soft snowflakes behind the content. */
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprites = {
      snow: glowSprite(FESTIVE.snow, 0.3),
      gold: glowSprite(FESTIVE.gold, 0.18),
      goldSoft: glowSprite(FESTIVE.goldSoft, 0.18),
      amber: glowSprite(FESTIVE.amber, 0.22),
      emerald: glowSprite(FESTIVE.emerald, 0.22),
    };
    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let parts: P[] = [];

    const make = (initial: boolean): P => {
      const roll = Math.random();
      const kind: Kind = roll < 0.45 ? "snow" : roll < 0.85 ? "spark" : "pollen";
      const sprite =
        kind === "snow"
          ? sprites.snow
          : kind === "spark"
            ? Math.random() < 0.7
              ? sprites.gold
              : sprites.goldSoft
            : Math.random() < 0.5
              ? sprites.amber
              : sprites.emerald;
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : -10,
        r:
          kind === "snow"
            ? 1.2 + Math.random() * 2.2
            : kind === "spark"
              ? 0.7 + Math.random() * 1.2
              : 0.8 + Math.random() * 1.1,
        vy:
          kind === "snow"
            ? 0.25 + Math.random() * 0.45
            : kind === "spark"
              ? 0.3 + Math.random() * 0.6
              : 0.1 + Math.random() * 0.25,
        vx: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2,
        sway: 0.3 + Math.random() * 0.9,
        kind,
        sprite,
        alpha: kind === "snow" ? 0.3 + Math.random() * 0.3 : 0.45 + Math.random() * 0.45,
      };
    };

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const twinkle = p.kind === "snow" ? 1 : 0.55 + 0.45 * Math.sin(t * 3 + p.phase * 4);
        ctx.globalAlpha = p.alpha * twinkle;
        // The sprite's bright core is about a third of its size; scale it to the particle radius.
        const size = p.r * (p.kind === "snow" ? 6 : 10);
        ctx.drawImage(p.sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(80, (w * h) / 16000));
      parts = Array.from({ length: count }, () => make(true));
      if (reduced) draw();
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      t += 0.016;
      for (const p of parts) {
        p.phase += 0.012 * p.sway;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.phase) * 0.35 * p.sway;
        if (p.y > h + 10 || p.x < -20 || p.x > w + 20) Object.assign(p, make(false));
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    // With reduced motion the sky stays still: one frame, no animation loop.
    if (!reduced) raf = requestAnimationFrame(tick);

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
