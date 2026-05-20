import { Copy, KeyRound, Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { formatDate, timeAgo } from "@/lib/utils";

export function SettingsApiKeysPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  if (!ws) return null;
  const keys = sync.apiKeys(ws.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">API Keys del workspace</h3>
          <p className="text-xs text-ink-muted">
            Úsalas para conectar la SESIÓN 2 (studio creativo) u otras integraciones.
          </p>
        </div>
        <button type="button" className="btn-primary">
          <Plus className="size-4" /> Nueva API key
        </button>
      </div>

      {keys.length === 0 ? (
        <p className="card px-4 py-6 text-sm text-ink-muted">
          No hay API keys generadas todavía.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-muted">
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Prefix</th>
                <th className="px-3 py-2 font-medium">Scopes</th>
                <th className="px-3 py-2 font-medium">Último uso</th>
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
                    <code className="rounded bg-hover px-1.5 py-0.5 text-xs">
                      {k.keyPrefix}...
                    </code>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span key={s} className="pill bg-hover text-ink-muted">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{timeAgo(k.lastUsedAt)}</td>
                  <td className="px-3 py-2.5 text-xs">{formatDate(k.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <button type="button" className="btn-ghost text-xs">
                      <Copy className="size-3" /> Copiar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-4 text-xs">
        <strong>Cómo usar la API:</strong>
        <pre className="mt-2 overflow-x-auto rounded-md bg-base p-3 text-[11px]">{`POST /api/v1/ingest/content-pieces
Authorization: Bearer sk_ws_xxxxxxxx
Idempotency-Key: <uuid>

{ "external_ref": "<uuid>", "title": "...", "format": "ugc_video", ... }`}</pre>
      </div>
    </div>
  );
}
