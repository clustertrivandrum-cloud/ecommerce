'use client';

const MESSAGE = '✦ Free Delivery on Orders Above ₹799';
const ITEMS = Array(12).fill(MESSAGE);

export function MarqueeStrip() {
  return (
    <div
      className="marquee-strip w-full min-h-9 overflow-hidden border-b border-border/40 bg-[#0d0d0d]"
      aria-label="Free delivery announcement"
    >
      <div className="marquee-track flex whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="marquee-content flex shrink-0 items-center"
            aria-hidden={copy === 1}
          >
            {ITEMS.map((msg, index) => (
              <span
                key={`${copy}-${index}`}
                className="inline-block select-none px-8 py-2.5 text-[10px] font-medium uppercase tracking-[0.22em] text-[#c9a84c] md:text-xs"
              >
                {msg}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
