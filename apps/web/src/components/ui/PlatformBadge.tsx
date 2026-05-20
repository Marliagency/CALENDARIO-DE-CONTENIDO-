import type { Platform } from "@pulse/types";
import { platformShort } from "@/lib/platform";
import { sync } from "@/lib/api/client";

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-hover px-1.5 py-0.5 text-[11px] font-semibold text-ink">
      {platformShort[platform]}
    </span>
  );
}

interface AccountChipProps {
  accountId: string;
}

export function AccountChip({ accountId }: AccountChipProps) {
  const accounts = sync.allAccounts();
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return <span className="text-xs text-ink-muted">cuenta desconocida</span>;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-hover px-1.5 py-0.5 text-[11px] font-medium">
      <span className="font-bold text-ink-muted">{platformShort[acc.platform]}</span>
      <span className="text-ink">{acc.handle}</span>
    </span>
  );
}
