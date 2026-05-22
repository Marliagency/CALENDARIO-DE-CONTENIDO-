import { Copy, KeyRound, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import type { WorkspaceApiKey } from "@pulse/types";
import { sync, mockMode } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { formatDate, timeAgo } from "@/lib/utils";

const ALL_SCOPES: { id: string; label: string }[] = [
  { id: "ingest", label: "ingest — recibir contenido desde el estudio" },
  { id: "read_brain", label: "read_brain — leer el Brand Brain" },
  { id: "read_metrics", label: "read_metrics — leer metricas" },
];

export function SettingsApiKeysPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  const [showForm, setShowForm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [keys, setKeys] = useState<WorkspaceApiKey[]>(() => sync.apiKeys(ws?.id ?? ""));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ws) return null;

  async function deleteKey(k: WorkspaceApiKey) {
    if (!confirm(`Eliminar la API key "${k.name}"? Esta accion es irreversible.`)) return;
    if (mockMode) { setError("Requiere modo HTTP."); return; }
    setBusy(k.id);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"}/api/v1/w/${slug}/api-keys/${k.id}`, {
        method: "DELETE", credentials: "include",
      });
      setKeys((prev) => prev.filter((x) => x.id !== k.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">API Keys del workspace</h3>
          <p className="text-xs text-ink-muted">
            Usalas para conectar integraciones externas o el ingest API.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Nueva API key
        </button>
      </div>

      {newToken && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/8 p-4">
          <p className="text-sm font-semibold text-emerald-400">API key creada — copia el token ahora</p>
          <p className="mt-1 text-xs text-emerald-300/70">Este es el unico momento en que se muestra el token completo.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-auto rounded bg-base px-2 py-1.5 text-xs font-mono">
              {newToken}
            </code>
            <button type="button" className="btn-secondary text-xs" onClick={() => copyToClipboard(newToken)}>
              <Copy className="size-3" /> Copiar
            </button>
          </div>
          <button type="button" className="mt-2 text-xs text-emerald-400/60 hover:text-emerald-400" onClick={() => setNewToken(null)}>
            He copiado el token — cerrar aviso
          </button>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="card px-4 py-6 text-sm text-ink-muted">No hay API keys generadas todavia.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-muted">
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Prefix</th>
                <th className="px-3 py-2 font-medium">Scopes</th>
                <th className="px-3 py-2 font-medium">Ultimo uso</th>
                <th className="px-3 py-2 font-medium">Creada</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2.5 font-medium">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-3.5 text-ink-muted" />
                      {k.name}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <code className="rounded bg-hover px-1.5 py-0.5 text-xs">{k.keyPrefix}...</code>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span key={s} className="pill bg-hover text-ink-muted">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{timeAgo(k.lastUsedAt)}</td>
                  <td className="px-3 py-2.5 text-xs">{formatDate(k.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button type="button" className="btn-ghost text-xs" onClick={() => copyToClipboard(k.keyPrefix)}>
                        <Copy className="size-3" />
                      </button>
                      <button type="button" className="btn-ghost text-xs text-red-400 hover:bg-red-500/10"
                        onClick={() => deleteKey(k)} disabled={busy === k.id}>
                        {busy === k.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-4 text-xs">
        <strong>Como usar la API:</strong>
        <pre className="mt-2 overflow-x-auto rounded-md bg-base p-3 text-[11px]">{`POST /api/v1/ingest/content-pieces
Authorization: Bearer sk_ws_xxxxxxxx
Idempotency-Key: <uuid>

{ "external_ref": "<uuid>", "title": "...", "format": "ugc_video", ... }`}</pre>
      </div>

      {showForm && (
        <NewApiKeyModal
          workspaceSlug={slug!}
          onClose={() => setShowForm(false)}
          onCreated={(key, token) => {
            setKeys((prev) => [...prev, key]);
            setNewToken(token);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function NewApiKeyModal({ workspaceSlug, onClose, onCreated }: {
  workspaceSlug: string;
  onClose: () => void;
  onCreated: (key: WorkspaceApiKey, token: string) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["ingest", "read_brain"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function submit() {
    if (mockMode) { setError("Requiere modo HTTP (pnpm dev + VITE_MOCK_API=0)."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await http.createApiKey(workspaceSlug, { name, scopes }) as WorkspaceApiKey & { token?: string };
      const token = res.token ?? res.keyPrefix;
      onCreated(res, token);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-sm p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Nueva API key</h3>
          <button type="button" className="btn-ghost" onClick={onClose}><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="label">Nombre *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Studio creativo" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="label">Scopes</label>
            <div className="flex flex-col gap-1.5">
              {ALL_SCOPES.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-hover"
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.id)}
                    onChange={() => toggleScope(s.id)}
                    className="size-3.5"
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        {error && <div className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={!name.trim() || scopes.length === 0 || submitting} onClick={submit}>
            {submitting && <Loader2 className="size-4 animate-spin" />} Crear key
          </button>
        </div>
      </div>
    </div>
  );
}
