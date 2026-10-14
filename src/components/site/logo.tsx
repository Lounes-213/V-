/**
 * Brand mark: a play triangle cut by the two strokes of a wave — the product's
 * whole idea (spoken word → video) in one glyph. Drawn as vectors so it stays
 * sharp, and painted in the IVS blue.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="IVS — Intelligent Video Studio">
      <defs>
        <linearGradient id="ivs-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B9DFF" />
          <stop offset="100%" stopColor="#1552CC" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="11" fill="url(#ivs-logo)" />
      <path
        d="M15.5 12.6c0-1.2 1.3-1.9 2.3-1.3l10.6 6.4c1 .6 1 2 0 2.6l-10.6 6.4c-1 .6-2.3-.1-2.3-1.3z"
        fill="#04140D"
        opacity="0.92"
      />
      <g stroke="#04140D" strokeWidth="2.1" strokeLinecap="round" opacity="0.75">
        <path d="M10.5 17.2v5.6" />
        <path d="M7.8 19v2" />
        <path d="M13.2 15.4v9.2" />
      </g>
      <circle cx="31.5" cy="9" r="3" fill="#8AB9FF" />
    </svg>
  );
}
