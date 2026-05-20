import { useId } from "react";

interface LineChartProps {
  data: { x: string; y: number; boost?: number }[];
  height?: number;
  yLabel?: string;
}

export function LineChart({ data, height = 220, yLabel }: LineChartProps) {
  const gradId = useId();
  const width = 720;
  const padding = { top: 16, right: 24, bottom: 28, left: 40 };
  const W = width - padding.left - padding.right;
  const H = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const maxY = Math.max(...data.map((d) => d.y), 1);
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + H - (d.y / maxY) * H,
    raw: d,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
    .join(" ");

  const areaD =
    pathD +
    ` L ${points[points.length - 1].x},${padding.top + H}` +
    ` L ${points[0].x},${padding.top + H} Z`;

  // Banda de boost (área sombreada cuando había boost)
  const boostPoints = points.filter((p) => (p.raw.boost ?? 0) > 0);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={yLabel ?? "Gráfica de línea"}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ws-primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--ws-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + H - t * H;
          const label = Math.round(maxY * t);
          return (
            <g key={t}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + W}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="2 4"
                opacity="0.5"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="end"
              >
                {formatNumber(label)}
              </text>
            </g>
          );
        })}
        {/* Boost area markers */}
        {boostPoints.map((p, i) => (
          <circle
            key={`boost-${i}`}
            cx={p.x}
            cy={padding.top + H + 6}
            r={3}
            fill="var(--ws-secondary)"
            opacity={0.7}
          />
        ))}
        {/* Area */}
        <path d={areaD} fill={`url(#${gradId})`} />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--ws-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="var(--bg-surface)"
              stroke="var(--ws-primary)"
              strokeWidth="2"
            />
            <title>{`${p.raw.x}: ${formatNumber(p.raw.y)}${
              p.raw.boost ? ` · boost ${p.raw.boost.toFixed(2)}€` : ""
            }`}</title>
          </g>
        ))}
        {/* X labels */}
        {points.map((p, i) => {
          if (data.length > 10 && i % 2 !== 0) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={height - 8}
              fill="var(--text-muted)"
              fontSize="10"
              textAnchor="middle"
            >
              {p.raw.x}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
