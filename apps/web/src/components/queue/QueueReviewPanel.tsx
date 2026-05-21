import { Check, Edit3, Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import type { ContentPiece, PlatformVariant } from "@pulse/types";
import { sync } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { useApiMutation } from "@/lib/api";
import { AccountChip } from "@/components/ui/PlatformBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { BoostStepper } from "./BoostStepper";
import { VariantPreview } from "./VariantPreview";
import { cn, formatDateTime } from "@/lib/utils";
import { formatEmoji, formatLabel } from "@/lib/platform";

interface QueueReviewPanelProps {
  piece: ContentPiece;
  workspaceSlug: string;
}

export function QueueReviewPanel({ piece, workspaceSlug }: QueueReviewPanelProps) {
  const variants = sync.variantsForPiece(piece.id);
  const [activeVariant, setActiveVariant] = useState<string>(variants[0]?.id ?? "");
  const current = variants.find((v) => v.id === activeVariant);

  const approve = useApiMutation(() => http.approvePiece(workspaceSlug, piece.id));
  const reject = useApiMutation((reason: string) =>
    http.rejectPiece(workspaceSlug, piece.id, reason),
  );
  const reqChanges = useApiMutation((reason: string) =>
    http.requestChanges(workspaceSlug, piece.id, reason),
  );

  const [lastAction, setLastAction] = useState<string | null>(null);

  async function handle(action: "approve" | "reject" | "changes") {
    try {
      if (action === "approve") await approve.mutate();
      if (action === "reject") {
        const reason = prompt("Motivo del rechazo?") ?? "";
        if (!reason.trim()) return;
        await reject.mutate(reason);
      }
      if (action === "changes") {
        const reason = prompt("Qué cambios pedir?") ?? "";
        if (!reason.trim()) return;
        await reqChanges.mutate(reason);
      }
      setLastAction(action);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            {formatEmoji[piece.format]} {formatLabel[piece.format]} ·{" "}
            <StatusPill status={piece.status} />
          </div>
          <h2 className="mt-1 text-lg font-semibold">{piece.title}</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary">
            <Edit3 className="size-3.5" /> Duplicar A/B
          </button>
        </div>
      </div>

      {/* Tabs por variante */}
      {variants.length > 1 && (
        <div className="flex gap-1 border-b border-border px-5 pt-3">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveVariant(v.id)}
              className={cn(
                "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                v.id === activeVariant
                  ? "border-ws text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              <AccountChip accountId={v.socialAccountId} />
            </button>
          ))}
        </div>
      )}

      {/* Cuerpo */}
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        {current && <VariantPreview variant={current} />}

        <div className="space-y-4">
          <Section title="Acciones">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handle("approve")}
                disabled={approve.loading}
              >
                {approve.loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}{" "}
                Aprobar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handle("changes")}
                disabled={reqChanges.loading}
              >
                <Edit3 className="size-3.5" /> Pedir cambios
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handle("reject")}
                disabled={reject.loading}
              >
                <X className="size-3.5" /> Rechazar
              </button>
            </div>
            {lastAction && (
              <div className="mt-2 text-xs text-emerald-400">
                Última acción: {lastAction} ✓
              </div>
            )}
            {(approve.error || reject.error || reqChanges.error) && (
              <div className="mt-2 text-xs text-red-400">
                Error: {(approve.error || reject.error || reqChanges.error)?.message}
              </div>
            )}
          </Section>

          <Section title="Programacion">
            <ScheduleSection variants={variants} workspaceSlug={workspaceSlug} />
          </Section>

          {current && (
            <Section title="Boost — presupuesto que decides invertir">
              <BoostStepper variant={current} />
            </Section>
          )}

          <Section title="Checklist QC">
            {piece.qcResults.length === 0 ? (
              <div className="text-xs text-emerald-400">
                ✅ Todas las validaciones pasaron.
              </div>
            ) : (
              <div className="space-y-1.5">
                {piece.qcResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.passed ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <X
                        className={cn(
                          "size-3.5",
                          r.severity === "error" ? "text-red-400" : "text-amber-400",
                        )}
                      />
                    )}
                    <span className="font-medium">{r.rule}</span>
                    {r.message && (
                      <span className="text-ink-muted">— {r.message}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Metadata creativa">
            <dl className="space-y-1 text-xs">
              {piece.hookUsed && (
                <Row label="Hook">{piece.hookUsed}</Row>
              )}
              {piece.frameworkUsed && (
                <Row label="Framework">{piece.frameworkUsed}</Row>
              )}
              {piece.buyerPersonaId && (
                <Row label="Persona">
                  {sync.personas(piece.workspaceId).find(
                    (p) => p.id === piece.buyerPersonaId,
                  )?.name ?? piece.buyerPersonaId}
                </Row>
              )}
              <Row label="Fuente">{piece.source === "studio" ? "Studio creativo" : "Manual"}</Row>
              <Row label="Creado">{formatDateTime(piece.createdAt)}</Row>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-3">
      <div className="label mb-2">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function ScheduleSection({
  variants,
  workspaceSlug,
}: {
  variants: PlatformVariant[];
  workspaceSlug: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, v.scheduledAt?.slice(0, 16) ?? ""])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveVariant(variantId: string) {
    const val = values[variantId];
    if (!val) return;
    setSaving(variantId);
    setError(null);
    try {
      const iso = new Date(val).toISOString();
      await http.scheduleVariant(workspaceSlug, variantId, iso);
      setSaved(variantId);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && <div className="text-xs text-red-400">{error}</div>}
      {variants.map((v) => (
        <div key={v.id} className="flex items-center gap-2 text-sm">
          <AccountChip accountId={v.socialAccountId} />
          <input
            type="datetime-local"
            value={values[v.id] ?? ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [v.id]: e.target.value }))
            }
            className="input w-auto flex-1"
          />
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => saveVariant(v.id)}
            disabled={saving === v.id || !values[v.id]}
          >
            {saving === v.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : saved === v.id ? (
              <Check className="size-3 text-emerald-400" />
            ) : (
              <Save className="size-3" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
