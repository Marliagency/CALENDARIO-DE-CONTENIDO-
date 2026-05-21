import { AlertCircle, Check, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { http } from "@/lib/api/http";
import { mockMode } from "@/lib/api/client";

interface ConnectionStatus {
  profile: string;
  found: boolean;
  accounts: Array<{ platform: string; handle: string | null; connected: boolean }>;
  manageUrl: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  threads: "Threads",
  pinterest: "Pinterest",
  reddit: "Reddit",
  bluesky: "Bluesky",
};

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  youtube: "▶️",
  linkedin: "💼",
  x: "🐦",
  threads: "🧵",
  pinterest: "📌",
  reddit: "👽",
  bluesky: "🦋",
};

export function SettingsConnectionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!slug) return;
    if (mockMode) {
      setStatus({
        profile: `${slug}-mock`,
        found: true,
        accounts: [
          { platform: "tiktok", handle: "@demo_account", connected: true },
          { platform: "instagram", handle: "@demo_account", connected: true },
          { platform: "facebook", handle: null, connected: false },
          { platform: "youtube", handle: null, connected: false },
          { platform: "linkedin", handle: null, connected: false },
          { platform: "x", handle: "@demo_account", connected: true },
        ],
        manageUrl: "https://app.upload-post.com",
      });
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await http.getConnectionsStatus(slug);
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function handleRefresh() {
    setRefreshing(true);
    void load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-ink-muted">
        <Loader2 className="mr-2 size-4 animate-spin" /> Consultando Upload-Post...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="text-sm font-semibold">Cuentas sociales</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Las cuentas se conectan en <strong>Upload-Post</strong> (no en Pulse). Cada
          workspace usa un perfil, y todas las cuentas vinculadas a ese perfil quedan
          disponibles automáticamente para publicar desde la cola.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">No se pudo consultar Upload-Post</div>
              <div className="text-xs text-red-300/80">{error}</div>
            </div>
          </div>
        )}

        {status && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-hover/40 p-3">
              <div className="text-sm">
                <span className="text-ink-muted">Perfil activo:</span>{" "}
                <code className="rounded bg-base px-2 py-0.5 font-mono text-xs">
                  {status.profile}
                </code>
                {!status.found && (
                  <span className="ml-2 text-xs text-amber-400">
                    (no encontrado en Upload-Post)
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}{" "}
                  Actualizar
                </button>
                <a
                  href={status.manageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs"
                >
                  <ExternalLink className="size-3" /> Gestionar en Upload-Post
                </a>
              </div>
            </div>

            {status.accounts.length === 0 ? (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-400">
                Este perfil aún no tiene cuentas conectadas. Entra en{" "}
                <a
                  href={status.manageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-amber-300"
                >
                  app.upload-post.com
                </a>{" "}
                para conectar TikTok, Instagram, Facebook, etc.
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                {status.accounts.map((acc) => (
                  <li
                    key={acc.platform}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-lg">{PLATFORM_EMOJI[acc.platform] ?? "🌐"}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {PLATFORM_LABELS[acc.platform] ?? acc.platform}
                        </div>
                        <div className="truncate text-xs text-ink-muted">
                          {acc.handle ?? "sin conectar"}
                        </div>
                      </div>
                    </div>
                    {acc.connected ? (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        <Check className="size-3" /> Conectada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md bg-hover px-2 py-0.5 text-xs text-ink-muted">
                        <X className="size-3" /> No conectada
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="card p-4 text-xs text-ink-muted">
        <strong className="text-ink">Cómo cambiar el perfil de este workspace</strong>
        <p className="mt-1">
          Edita <code className="rounded bg-hover px-1 py-0.5 font-mono">.env.local</code>{" "}
          y modifica la variable{" "}
          <code className="rounded bg-hover px-1 py-0.5 font-mono">
            UPLOAD_POST_PROFILE_{slug?.toUpperCase().replace(/-/g, "_")}
          </code>
          . Luego reinicia el API.
        </p>
      </div>
    </div>
  );
}
