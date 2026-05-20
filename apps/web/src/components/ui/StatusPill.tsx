import { cn } from "@/lib/utils";
import { statusColor, statusLabel } from "@/lib/platform";

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        statusColor[status] ?? "bg-slate-500/15 text-slate-400",
      )}
    >
      {statusLabel[status] ?? status}
    </span>
  );
}
