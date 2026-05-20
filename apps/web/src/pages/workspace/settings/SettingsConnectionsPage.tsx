import {
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Twitter,
  X,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import type { Platform, SocialAccount } from "@pulse/types";
import { sync, mockMode } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { dataCache } from "@/lib/api/data-cache";
import {
  accountStatusColor,
  accountStatusLabel,
  platformLabel,
} from "@/lib/platform";
import { cn } from "@/lib/utils";

const ICONS: Record<Platform, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Plus,
  youtube: Youtube,
  linkedin: Linkedin,
  pinterest: Plus,
  twitter_x: Twitter,
};

const PLATFORMS: Platform[] = [
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "linkedin",
  "pinterest",
  "twitter_x",
];

const FORMATS_BY_PLATFORM: Record<Platform, string[]> = {
  instagram: ["image", "carousel", "reel"],
  facebook: ["image", "post", "carousel"],
  tiktok: ["reel", "ugc_video"],
  youtube: ["short", "lifestyle_ad"],
  linkedin: ["image", "post", "carousel"],
  pinterest: ["image"],
  twitter_x: ["post", "image"],
};

export function SettingsConnectionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  const [connectPlatform, setConnectPlatform] = useState<Platform | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  if (!ws) return null;

  const accounts = sync.accounts(ws.id);
  const limits = sync.rateLimits();

  const byPlatform = PLATFORMS.reduce<Record<Platform, SocialAccount[]>>(
    (acc, p) => {
      acc[p] = accounts.filter((a) => a.platform === p);
      return acc;
    },
    {} as Record<Platform, SocialAccount[]>,
  );

  async function disconnect(acc: SocialAccount) {
    if (mockMode) {
      setError("En modo mock no se pueden desconectar cuentas.");
      return;
    }
    if (!slug) return;
    if (
      !confirm(
        `¿Desconectar @${acc.handle} (${platformLabel[acc.platform]})? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setBusy(acc.id);
    setError(null);
    try {
      await http.deleteAccount(slug, acc.id);
      await dataCache.refetchAccounts(slug);
      forceRender((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function connect(platform: Platform) {
    if (mockMode) {
      setError(
        "En modo mock no se pueden conectar cuentas reales. Arranca la API con `pnpm dev:api` y pon VITE_MOCK_API=0.",
      );
      return;
    }
    setError(null);
    // Intentamos primero OAuth real; si no está configurado, abrimos el form manual.
    try {
      const res = await http.oauthStart(platform, slug ?? "");
      if (res.configured && res.url) {
        window.open(res.url, "oauth", "width=560,height=720");
        return;
      }
    } catch {
      /* ignore — caemos al modo manual */
    }
    setConnectPlatform(platform);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Cuentas conectadas
          </h3>
          {mockMode && (
            <span className="text-[11px] text-ink-muted">
              Modo mock — la conexión real requiere VITE_MOCK_API=0
            </span>
          )}
        </div>
        {accounts.length === 0 ? (
          <p className="card px-4 py-6 text-sm text-ink-muted">
            Aún no hay cuentas conectadas. Conecta la primera abajo.
          </p>
        ) : (
          PLATFORMS.map((p) => {
            if (byPlatform[p].length === 0) return null;
            return (
              <div key={p}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    {platformLabel[p].toUpperCase()}
                  </h4>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => connect(p)}
                  >
                    <Plus className="size-3" /> Añadir otra cuenta de{" "}
                    {platformLabel[p]}
                  </button>
                </div>
                <div className="space-y-2">
                  {byPlatform[p].map((acc) => {
                    const limit = limits.find(
                      (l) =>
                        l.socialAccountId === acc.id &&
                        l.date === new Date().toISOString().slice(0, 10),
                    );
                    return (
                      <div key={acc.id} className="card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{acc.handle}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                              <span>{acc.nickname}</span>
                              {acc.platformIgUserId && (
                                <span>· IG ID: {acc.platformIgUserId}</span>
                              )}
                              {acc.isAdsEnabled && (
                                <span className="pill bg-violet-500/15 text-violet-400">
                                  Ads activos
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              accountStatusColor[acc.status] ??
                                "bg-hover text-ink",
                            )}
                          >
                            {accountStatusLabel[acc.status] ?? acc.status}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-ink-muted">Formatos:</span>
                          {acc.activeFormats.map((f) => (
                            <span key={f} className="pill bg-hover text-ink">
                              {f}
                            </span>
                          ))}
                        </div>

                        {limit && (
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-ink-muted">Posts hoy</span>
                              <span className="tabular-nums">
                                {limit.postsUsed} / {limit.postsLimit}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-hover">
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  limit.postsUsed / limit.postsLimit > 0.9
                                    ? "bg-red-400"
                                    : limit.postsUsed / limit.postsLimit > 0.7
                                      ? "bg-amber-400"
                                      : "bg-emerald-400",
                                )}
                                style={{
                                  width: `${(limit.postsUsed / limit.postsLimit) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {acc.lastError && (
                          <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                            ⚠ {acc.lastError}
                          </div>
                        )}

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            onClick={() => connect(acc.platform)}
                          >
                            <RefreshCw className="size-3" /> Reconectar
                          </button>
                          <button
                            type="button"
                            className="btn-ghost text-xs text-red-400 hover:bg-red-500/10"
                            onClick={() => disconnect(acc)}
                            disabled={busy === acc.id}
                          >
                            {busy === acc.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}{" "}
                            Desconectar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Añadir nueva cuenta
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PLATFORMS.map((p) => {
            const Icon = ICONS[p];
            return (
              <button
                key={p}
                type="button"
                className="card flex flex-col items-center gap-2 p-4 transition-colors hover:bg-hover"
                onClick={() => connect(p)}
              >
                <Icon className="size-6" />
                <div className="text-sm font-medium">{platformLabel[p]}</div>
                <div className="text-[11px] text-ink-muted">+ Añadir cuenta</div>
              </button>
            );
          })}
        </div>
        <details className="card mt-4 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            ¿Cómo funciona la conexión?
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-ink-muted">
            <li>
              · Si las credenciales OAuth de la plataforma están configuradas
              (META_APP_ID, TIKTOK_CLIENT_KEY, GOOGLE_CLIENT_ID en .env.local),
              al pulsar &ldquo;Añadir cuenta&rdquo; se abre el flujo OAuth real.
            </li>
            <li>
              · Si no, se abre un formulario manual (dev-connect) que crea la
              cuenta en BD con tokens dummy. Útil para probar el resto del
              sistema sin esperar el App Review de Meta/TikTok/Google.
            </li>
            <li>
              · Las cuentas conectadas en modo dev-connect no pueden publicar
              de verdad — el job runner las marcará como fallidas si lo
              intenta.
            </li>
          </ul>
        </details>
      </section>

      {connectPlatform && (
        <DevConnectModal
          platform={connectPlatform}
          workspaceSlug={slug ?? ""}
          onClose={() => setConnectPlatform(null)}
          onConnected={async () => {
            setConnectPlatform(null);
            if (slug) {
              await dataCache.refetchAccounts(slug);
              forceRender((n) => n + 1);
            }
          }}
        />
      )}
    </div>
  );
}

function DevConnectModal({
  platform,
  workspaceSlug,
  onClose,
  onConnected,
}: {
  platform: Platform;
  workspaceSlug: string;
  onClose: () => void;
  onConnected: () => void | Promise<void>;
}) {
  const [nickname, setNickname] = useState("");
  const [handle, setHandle] = useState("");
  const [formats, setFormats] = useState<string[]>(
    FORMATS_BY_PLATFORM[platform].slice(0, 1),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFormat(f: string) {
    setFormats((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await http.devConnect({
        workspaceSlug,
        platform,
        nickname,
        handle: handle.replace(/^@/, ""),
        activeFormats: formats,
      });
      await onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = nickname.trim().length > 0 && handle.trim().length > 0 && formats.length > 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              Conectar cuenta de {platformLabel[platform]}
            </h3>
            <p className="text-xs text-ink-muted">
              Modo manual (dev-connect) — útil para probar sin OAuth real.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="label">Nickname interno</label>
            <input
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="QYRO principal"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="label">Handle público</label>
            <input
              className="input"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@qyro.app"
            />
          </div>
          <div className="space-y-1">
            <label className="label">Formatos activos</label>
            <div className="flex flex-wrap gap-2">
              {FORMATS_BY_PLATFORM[platform].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFormat(f)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs",
                    formats.includes(f)
                      ? "bg-ws text-white"
                      : "bg-hover text-ink-muted",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit || submitting}
            onClick={submit}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />} Conectar
          </button>
        </div>
      </div>
    </div>
  );
}
