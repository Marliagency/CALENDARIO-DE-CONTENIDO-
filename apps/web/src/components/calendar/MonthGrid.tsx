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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  ContentPiece,
  PlatformVariant,
  SocialAccount,
  Workspace,
} from "@pulse/types";
import { cn } from "@/lib/utils";
import { platformShort } from "@/lib/platform";
import { http } from "@/lib/api/http";
import { mockMode } from "@/lib/api/client";

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
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Aplica los movimientos optimistas a la lista efectiva.
  const effectiveVariants = useMemo(
    () =>
      variants.map((v) =>
        optimistic[v.id] ? { ...v, scheduledAt: optimistic[v.id] } : v,
      ),
    [variants, optimistic],
  );

  const variantsByDay = useMemo(() => {
    const map = new Map<string, PlatformVariant[]>();
    for (const v of effectiveVariants) {
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
  }, [effectiveVariants]);

  async function moveVariant(variantId: string, targetDay: string) {
    if (readonly || !workspaceSlug) return;
    const variant = effectiveVariants.find((v) => v.id === variantId);
    if (!variant || !variant.scheduledAt) return;

    const currentDay = format(parseISO(variant.scheduledAt), "yyyy-MM-dd");
    if (currentDay === targetDay) return;

    // Conservar la hora original al cambiar de día.
    const original = parseISO(variant.scheduledAt);
    const [y, m, d] = targetDay.split("-").map(Number);
    const next = new Date(original);
    next.setFullYear(y, m - 1, d);
    const nextIso = next.toISOString();

    // Optimistic update.
    setOptimistic((prev) => ({ ...prev, [variantId]: nextIso }));

    if (mockMode) return;

    setPendingMove(variantId);
    try {
      await http.scheduleVariant(workspaceSlug, variantId, nextIso);
    } catch {
      // Rollback en error.
      setOptimistic((prev) => {
        const { [variantId]: _, ...rest } = prev;
        return rest;
      });
    } finally {
      setPendingMove(null);
    }
  }

  const canDrag = !readonly && !!workspaceSlug;

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
        <div className="flex items-center gap-3">
          {canDrag && (
            <span className="hidden text-[11px] text-ink-muted md:inline">
              Arrastra una pieza a otro día para reprogramarla
            </span>
          )}
          {pendingMove && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <Loader2 className="size-3 animate-spin" /> Guardando…
            </span>
          )}
          <div className="text-sm font-semibold capitalize">
            {format(cursor, "MMMM yyyy", { locale: es })}
          </div>
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
          const isHover = hoverDay === dayKey;
          return (
            <div
              key={dayKey}
              onDragOver={(e) => {
                if (!canDrag) return;
                e.preventDefault();
                if (hoverDay !== dayKey) setHoverDay(dayKey);
              }}
              onDragLeave={() => {
                if (hoverDay === dayKey) setHoverDay(null);
              }}
              onDrop={(e) => {
                if (!canDrag) return;
                e.preventDefault();
                setHoverDay(null);
                const id = e.dataTransfer.getData("text/variant-id");
                if (id) moveVariant(id, dayKey);
              }}
              className={cn(
                "min-h-[110px] border-b border-r border-border p-1.5 text-xs transition-colors",
                !inMonth && "opacity-40",
                today && "bg-hover/40",
                isHover && canDrag && "bg-ws/10 ring-1 ring-inset ring-ws",
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
                  const isMoving = pendingMove === v.id;
                  const content = (
                    <div
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                        v.status === "published"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : v.status === "scheduled"
                            ? "bg-blue-500/15 text-blue-300"
                            : "bg-amber-500/15 text-amber-300",
                        canDrag && "cursor-move",
                        isMoving && "opacity-50",
                      )}
                      style={{
                        borderLeft: `2px solid ${ws?.brandColorPrimary ?? "#94A3B8"}`,
                      }}
                      title={piece?.title}
                      draggable={canDrag && !isMoving}
                      onDragStart={(e) => {
                        if (!canDrag) return;
                        e.dataTransfer.setData("text/variant-id", v.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
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
                      onDragStart={(e) => e.stopPropagation()}
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
