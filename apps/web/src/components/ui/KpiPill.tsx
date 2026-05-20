import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiPillProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
}

export function KpiPill({ label, value, delta, deltaLabel }: KpiPillProps) {
  const positive = (delta ?? 0) > 0;
  const negative = (delta ?? 0) < 0;

  return (
    <div className="card flex flex-col gap-1 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
      {delta != null && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs",
            positive && "text-emerald-400",
            negative && "text-red-400",
            !positive && !negative && "text-ink-muted",
          )}
        >
          {positive && <TrendingUp className="size-3" />}
          {negative && <TrendingDown className="size-3" />}
          <span>
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}% {deltaLabel ?? "vs. periodo anterior"}
          </span>
        </div>
      )}
    </div>
  );
}
