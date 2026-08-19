interface Point {
  date: string;
  citations: number;
}

/** Grafik garis SVG murni untuk tren sitasi; aman dirender di server. */
export function TrendChart({ points, height = 120 }: { points: Point[]; height?: number }) {
  if (points.length === 0) return null;

  const width = 560;
  const pad = { top: 12, right: 12, bottom: 22, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = Math.max(1, ...points.map((p) => p.citations));
  const x = (i: number) =>
    pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.citations).toFixed(1)}`)
    .join(' ');

  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Grafik tren total sitasi"
    >
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text x={pad.left - 6} y={y(max * f) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#6366f1" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.citations)} r="2.5" fill="#6366f1" />
          {i % labelEvery === 0 && (
            <text x={x(i)} y={height - 6} textAnchor="middle" fontSize="9" fill="#64748b">
              {p.date.slice(0, 7)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
