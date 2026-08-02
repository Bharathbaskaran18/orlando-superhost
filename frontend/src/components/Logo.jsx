/*
  Logo component — location pin icon + two-line serif text.

  SVG viewBox "0 0 44 58":
    pin circle  : cx=22 cy=23 r=13  (navy head)
    pin tail    : polygon 14,31 → 22,55 → 30,31  (overlaps into circle for seamless fill)
    inner circle: cx=22 cy=23 r=8  (white)
    star text   : centred at (22,23)  (amber)
    7 rays      : around the circle, no 6-o-clock ray

  variant="light"  → navy pin  + navy  "Orlando"   (white / light card backgrounds)
  variant="dark"   → white pin + white "Orlando"   (navy / dark backgrounds)
  "Superhost" is always amber.
*/

const RAYS = [
  [22,   8,  22,  2  ],  // 12 o'clock
  [ 7,  23,   1, 23  ],  //  9 o'clock
  [37,  23,  43, 23  ],  //  3 o'clock
  [11.4, 12.4,  7.2,  8.2],  // top-left  diagonal
  [32.6, 12.4, 36.8,  8.2],  // top-right diagonal
  [11.4, 33.6,  7.2, 37.8],  // bottom-left  diagonal
  [32.6, 33.6, 36.8, 37.8],  // bottom-right diagonal
];

export default function Logo({ scale = 1, variant = 'light' }) {
  const pin     = variant === 'dark' ? 'white' : '#0D2B6B';
  const textCol = variant === 'dark' ? 'white' : '#0D2B6B';
  const accent  = '#F57C00';
  const serif   = "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";

  const iconW = Math.round(44 * scale);
  const iconH = Math.round(58 * scale);

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: Math.round(10 * scale),
      lineHeight: 1,
      userSelect: 'none',
    }}>

      {/* ── PIN ICON ─────────────────────────────────── */}
      <svg
        width={iconW}
        height={iconH}
        viewBox="0 0 44 58"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
      >
        {/* Sun rays drawn first — pin renders on top */}
        {RAYS.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={accent}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ))}

        {/* Pin head (filled circle) */}
        <circle cx="22" cy="23" r="13" fill={pin} />

        {/* Pin tail (filled triangle, base inside circle = seamless) */}
        <polygon points="14,31 22,55 30,31" fill={pin} />

        {/* White inner circle */}
        <circle cx="22" cy="23" r="8" fill="white" />

        {/* Yellow star centred in inner circle */}
        <text
          x="22"
          y="23"
          textAnchor="middle"
          dy="0.38em"
          fill={accent}
          fontSize="13"
          fontWeight="bold"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          ★
        </text>
      </svg>

      {/* ── TEXT ─────────────────────────────────────── */}
      <span style={{
        display: 'flex',
        flexDirection: 'column',
        gap: Math.round(4 * scale),
        lineHeight: 1,
      }}>
        <span style={{
          fontFamily: serif,
          fontSize: Math.round(26 * scale),
          fontWeight: 700,
          color: textCol,
          lineHeight: 1,
          letterSpacing: '0px',
        }}>
          Orlando
        </span>
        <span style={{
          fontFamily: serif,
          fontSize: Math.round(17 * scale),
          fontWeight: 400,
          color: accent,
          lineHeight: 1,
          letterSpacing: `${Math.round(2 * scale)}px`,
        }}>
          Superhost
        </span>
      </span>

    </span>
  );
}
