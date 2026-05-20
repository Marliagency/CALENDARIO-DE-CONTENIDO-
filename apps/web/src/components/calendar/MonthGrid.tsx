import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ContentPiece, PlatformVariant, SocialAccount, Workspace } from "@pulse/types";
import { cn } from "@/lib/utils";
import { platformShort } from "@/lib/platform";

interface MonthGridProps {
  variants: PlatformVariant[];
  pieces: ContentPiece[];
  workspaces: Workspace[];
  accounts: SocialAccount[];
  readonly?: boolean;
  workspaceSlug?: string;
}

export function MonthGrid({
  variants,
  pieces,
  workspaces,
  accounts,
  readonly,
  workspaceSlug,
}: MonthGridProps) {
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const variantsByDay = useMemo(() => {
    const map = new Map<string, PlatformVariant[]>();
    for (const v of variants) {
      if (!v.scheduledAt) continue;
      try {
        const day = format(parseISO(v.scheduledAt), "yyyy-MM-dd");
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(v);
      } catch {
        /* noop */
      }
    }
    return map;
  }, [variants]);

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setCursor(subMonths(cursor, 1))}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setCursor(new Date())}
          >
            Hoy
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setCursor(addMonths(cursor, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="text-sm font-semibold capitalize">
          {format(cursor, "MMMM yyyy", { locale: es })}
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border text-xs uppercase tracking-wide text-ink-muted">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const dayKey = format(d, "yyyy-MM-dd");
          const dayVariants = variantsByDay.get(dayKey) ?? [];
          const inMonth = isSameMonth(d, cursor);
          const today = isSameDay(d, new Date());
          return (
            <div
              key={dayKey}
              className={cn(
                "min-h-[110px] border-b border-r border-border p-1.5 text-xs",
                !inMonth && "opacity-40",
                today && "bg-hover/40",
              )}
            >
              <div
                className={cn(
                  "mb-1 text-right text-[11px] font-semibold",
                  today && "text-ws",
                )}
              >
                {format(d, "d")}
              </div>
              <div className="space-y-0.5">
                {dayVariants.slice(0, 4).map((v) => {
                  const piece = pieces.find((p) => p.id === v.contentPieceId);
                  const ws = workspaces.find((w) => w.id === v.workspaceId);
                  const acc = accounts.find((a) => a.id === v.socialAccountId);
                  const content = (
                    <div
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                        v.status === "published"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : v.status === "scheduled"
                            ? "bg-blue-500/15 text-blue-300"
                            : "bg-amber-500/15 text-amber-300",
                      )}
                      style={{
                        borderLeft: `2px solid ${ws?.brandColorPrimary ?? "#94A3B8"}`,
                      }}
                      title={piece?.title}
                    >
                      <span className="font-bold mr-1">
                        {acc ? platformShort[acc.platform] : ""}
                      </span>
                      {piece?.title ?? "—"}
                    </div>
                  );
                  if (readonly || !workspaceSlug) {
                    return (
                      <Link
                        key={v.id}
                        to={`/w/${
                          workspaces.find((w) => w.id === v.workspaceId)?.slug
                        }/queue/review?piece=${v.contentPieceId}`}
                      >
                        {content}
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={v.id}
                      to={`/w/${workspaceSlug}/queue/review?piece=${v.contentPieceId}`}
                    >
                      {content}
                    </Link>
                  );
                })}
                {dayVariants.length > 4 && (
                  <div className="text-[10px] text-ink-muted">
                    +{dayVariants.length - 4} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
