import { FESTIVE } from "./festive-colors";

/** Multi-volley full-screen salute for ~4 seconds from both sides and the sky. */
export async function launchFireworks(durationMs = 4000) {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  const colors = [FESTIVE.gold, FESTIVE.goldSoft, FESTIVE.ruby, FESTIVE.emerald, FESTIVE.amber];
  const end = Date.now() + durationMs;
  const base = {
    colors,
    zIndex: 9999,
    ticks: 220,
    gravity: 0.9,
    scalar: 1.05,
    disableForReducedMotion: true,
  };

  // Opening cannons from both bottom corners
  confetti({
    ...base,
    particleCount: 120,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.95 },
    startVelocity: 65,
  });
  confetti({
    ...base,
    particleCount: 120,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.95 },
    startVelocity: 65,
  });

  const interval = window.setInterval(() => {
    const left = end - Date.now();
    if (left <= 0) {
      window.clearInterval(interval);
      // Grand finale
      confetti({
        ...base,
        particleCount: 200,
        spread: 160,
        startVelocity: 55,
        origin: { x: 0.5, y: 0.45 },
      });
      return;
    }
    // Aerial shell bursting in the sky
    confetti({
      ...base,
      particleCount: 70,
      spread: 360,
      startVelocity: 32,
      shapes: ["circle", "star"],
      origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.35 },
    });
    // Side streams
    confetti({ ...base, particleCount: 25, angle: 55, spread: 55, origin: { x: 0, y: 0.7 } });
    confetti({ ...base, particleCount: 25, angle: 125, spread: 55, origin: { x: 1, y: 0.7 } });
  }, 380);
}
