import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { http } from "@/lib/api/http";
import { mockMode } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

interface AuditEntry {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string | null;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  actorId: string | null;
  actorIp: string | null;
  notes: string | null;
  createdAt: string;
}

// Mock data para modo mock.
const MOCK_AUDIT: AuditEntry[] = [
  {
    id: "audit-1",
    workspaceId: "ws-qyro",
    entityType: "ContentPiece",
    entityId: "piece-1",
    action: "approve",
    fromValue: "in_review",
    toValue: "approved",
    actorId: "user-diego",
    actorIp: null,
    notes: null,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-2",
    workspaceId: "ws-qyro",
    entityType: "BrandBrain",
    entityId: "brain-qyro",
    action: "update",
    fromValue: null,
    toValue: null,
    actorId: "user-diego",
    actorIp: null,
    notes: "taglineMain, brandAdjectives",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-3",
    workspaceId: "ws-qyro",
    entityType: "BrandAsset",
    entityId: "asset-1",
    action: "upload",
    fromValue: null,
    toValue: null,
    actorId: "user-diego",
    actorIp: null,
    notes: "document · Análisis competitivo Q1 2026.pdf",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

const ACTION_COLORS: Record<string, string> = {
  approve: "bg-emerald-500/15 text-emerald-400",
  reject: "bg-red-500/15 text-red-400",
  request_changes: "bg-amber-500/15 text-amber-400",
  update: "bg-blue-500/15 text-blue-400",
  upload: "bg-violet-500/15 text-violet-400",
  delete: "bg-red-500/15 text-red-400",
  create: "bg-emerald-500/15 text-emerald-400",
};

export function SettingsAuditPage() {
  const { slug } = useParams<{ slug: string }>();
  const [items, setItems] = useState<AuditEntry[]>(mockMode ? MOCK_AUDIT : []);
  const [loading, setLoading] = useState(!mockMode);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<string>("");

  async function load() {
    if (mockMode || !slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await http.getAudit(slug, 200)) as AuditEntry[];
      setItems(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const entityTypes = Array.from(new Set(items.map((i) => i.entityType))).sort();
  const filtered = entityType
    ? items.filter((i) => i.entityType === entityType)
    : items;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Audit log</h3>
          <p className="text-xs text-ink-muted">
            Cada cambio relevante del workspace queda registrado aquí. Útil para
            entender quién hizo qué y cuándo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input w-auto text-xs"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">Todas las entidades</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card px-4 py-8 text-center text-sm text-ink-muted">
          {loading ? "Cargando…" : "No hay eventos auditados todavía."}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-base/50 text-left text-xs text-ink-muted">
                <th className="px-3 py-2 font-medium">Cuándo</th>
                <th className="px-3 py-2 font-medium">Acción</th>
                <th className="px-3 py-2 font-medium">Entidad</th>
                <th className="px-3 py-2 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs tabular-nums text-ink-muted">
                    {formatDateTime(e.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        ACTION_COLORS[e.action] ?? "bg-hover text-ink",
                      )}
                    >
                      {e.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{e.entityType}</div>
                    {e.entityId && (
                      <code className="text-[10px] text-ink-muted">
                        {e.entityId.slice(0, 8)}…
                      </code>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">
                    {e.notes ?? (
                      e.fromValue && e.toValue ? (
                        <span className="text-xs">
                          {e.fromValue}{" "}
                          <span className="text-ink-muted">→</span> {e.toValue}
                        </span>
                      ) : (
                        "—"
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
