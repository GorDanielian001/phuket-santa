const TONES = ["bulb-gold", "bulb-ruby", "bulb-ivory", "bulb-emerald"];
const COUNT = 24;

/** A sagging wire of glowing bulbs across the top of the page. */
export function Garland() {
  return (
    <div aria-hidden className="pointer-events-none relative h-12 w-full overflow-hidden">
      <svg
        className="absolute inset-x-0 top-0 h-10 w-full"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
      >
        <path
          d="M0 1 Q 12.5 8 25 1 T 50 1 T 75 1 T 100 1"
          className="fill-none stroke-gold/40"
          strokeWidth="0.25"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {Array.from({ length: COUNT }).map((_, i) => {
        const x = (i + 0.5) / COUNT; // 0..1
        // Same curve as the path: four sagging arcs
        const local = (x * 4) % 1;
        const y = 4 + Math.sin(local * Math.PI) * 26;
        return (
          <span
            key={i}
            // Every other bulb hides on phones so the wire does not look crowded.
            // Tones are spread so the visible half on phones still cycles through all four colours.
            className={`bulb ${TONES[(Math.floor(i / 2) + (i % 2) * 2) % TONES.length]} absolute ${i % 2 ? "max-sm:hidden" : ""}`}
            style={{
              left: `calc(${x * 100}% - 6px)`,
              top: `${y}px`,
              animationDelay: `${(i % 6) * 0.4}s`,
            }}
          />
        );
      })}
    </div>
  );
}
