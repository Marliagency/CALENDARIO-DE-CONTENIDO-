import { AlertTriangle, Inbox, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { ContentPiece, ContentStatus } from "@pulse/types";
import { sync } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { AccountChip } from "@/components/ui/PlatformBadge";
import { QueueReviewPanel } from "@/components/queue/QueueReviewPanel";
import { NewPieceModal } from "@/components/queue/NewPieceModal";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { cn, formatEur, timeAgo } from "@/lib/utils";
import { formatEmoji, formatLabel } from "@/lib/platform";

type Tab = "pending" | "scheduled" | "published" | "rejected";

const TABS: { id: Tab; label: string; statuses: ContentStatus[] }[] = [
  { id: "pending", label: "Pendiente", statuses: ["in_review", "changes_requested", "ingest_rejected"] },
  { id: "scheduled", label: "Programado", statuses: ["approved", "scheduled"] },
  { id: "published", label: "Publicado", statuses: ["published", "analyzed"] },
  { id: "rejected", label: "Rechazado", statuses: ["rejected", "failed"] },
];

export function QueuePage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = slug ? sync.workspace(slug) : undefined;
  const [tab, setTab] = useState<Tab>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewPiece, setShowNewPiece] = useState(false);

  if (!ws) return <NotFoundPage />;

  const pieces = sync.pieces(ws.id);

  const filtered = useMemo(() => {
    const statuses = TABS.find((t) => t.id === tab)?.statuses ?? [];
    return pieces
      .filter((p) => statuses.includes(p.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [pieces, tab]);

  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div>
      {showNewPiece && (
        <NewPieceModal
          onClose={() => setShowNewPiece(false)}
          onCreated={() => setShowNewPiece(false)}
        />
      )}
      <PageHeader
        title="Cola"
        description="Bandeja del workspace. Revisa, aprueba, programa y boost por pieza."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewPiece(true)}
              className="btn-primary"
            >
              <Plus className="size-4" />
              Nueva pieza
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-base p-0.5">
              {TABS.map((t) => {
                const count = pieces.filter((p) => t.statuses.includes(p.status)).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      setSelectedId(null);
                    }}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                      tab === t.id
                        ? "bg-surface text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {t.label}
                    <span className="ml-1.5 text-xs text-ink-muted">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="Nada por aquí"
            description={
              tab === "pending"
                ? "Cuando tengas piezas por revisar las verás listadas aquí."
                : "No hay contenido en este estado."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[40%_60%] xl:grid-cols-[36%_64%]">
          <QueueList
            pieces={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
          />
          {selected ? (
            <QueueReviewPanel piece={selected} workspaceSlug={ws.slug} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function QueueList({
  pieces,
  selectedId,
  onSelect,
}: {
  pieces: ContentPiece[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="border-r border-border">
      {pieces.map((p) => {
        const variants = sync.variantsForPiece(p.id);
        const totalBoost = variants.reduce((s, v) => s + (v.boostBudgetEur ?? 0), 0);
        const hasQcFail = p.qcResults.some((r) => !r.passed && r.severity === "error");
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors",
              selectedId === p.id ? "bg-hover" : "hover:bg-hover/60",
            )}
          >
            <span className="mt-0.5 grid size-12 shrink-0 place-items-center rounded-md bg-hover text-xl">
              {formatEmoji[p.format] ?? "📄"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="truncate text-sm font-semibold">{p.title}</div>
                <span className="shrink-0 text-[11px] text-ink-muted">
                  {timeAgo(p.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <StatusPill status={p.status} />
                <span className="text-[11px] text-ink-muted">
                  {formatLabel[p.format]}
                </span>
                {totalBoost > 0 && (
                  <span className="pill bg-ws/15 text-ws">
                    💰 {formatEur(totalBoost)}
                  </span>
                )}
                {hasQcFail && (
                  <AlertTriangle className="size-3.5 text-amber-400" />
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.targetAccounts.map((accId) => (
                  <AccountChip key={accId} accountId={accId} />
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
