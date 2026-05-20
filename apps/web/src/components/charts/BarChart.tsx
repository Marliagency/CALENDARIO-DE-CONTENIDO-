interface BarChartProps {
  data: {
    label: string;
    sublabel?: string;
    organic: number;
    paid?: number;
  }[];
  unit?: string;
}

export function BarChart({ data, unit }: BarChartProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.organic + (d.paid ?? 0)), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const total = d.organic + (d.paid ?? 0);
        const organicW = (d.organic / max) * 100;
        const paidW = ((d.paid ?? 0) / max) * 100;
        return (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <div>
                <span className="font-medium">{d.label}</span>
                {d.sublabel && (
                  <span className="ml-2 text-ink-muted">{d.sublabel}</span>
                )}
              </div>
              <span className="font-semibold tabular-nums">
                {formatNumber(total)}
                {unit && ` ${unit}`}
              </span>
            </div>
            <div className="flex h-6 overflow-hidden rounded-md bg-hover">
              <div
                className="h-full"
                style={{
                  width: `${organicW}%`,
                  backgroundColor: "var(--ws-primary)",
                }}
                title={`Orgánico: ${formatNumber(d.organic)}`}
              />
              {paidW > 0 && (
                <div
                  className="h-full"
                  style={{
                    width: `${paidW}%`,
                    backgroundColor: "var(--ws-secondary)",
                  }}
                  title={`Boost: ${formatNumber(d.paid ?? 0)}`}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-1 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ backgroundColor: "var(--ws-primary)" }} />
          Orgánico
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ backgroundColor: "var(--ws-secondary)" }} />
          Con boost
        </span>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
