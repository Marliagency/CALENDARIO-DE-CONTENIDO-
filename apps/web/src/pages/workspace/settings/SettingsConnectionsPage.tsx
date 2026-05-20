import { Facebook, Instagram, Linkedin, Plus, RefreshCw, Trash2, Twitter, Youtube } from "lucide-react";
import { useParams } from "react-router-dom";
import type { Platform, SocialAccount } from "@pulse/types";
import { sync } from "@/lib/api/client";
import { accountStatusColor, accountStatusLabel, platformLabel } from "@/lib/platform";
import { cn } from "@/lib/utils";

const ICONS: Record<Platform, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Plus, // sin icono lucide para TikTok — usamos texto
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

export function SettingsConnectionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  if (!ws) return null;

  const accounts = sync.accounts(ws.id);
  const limits = sync.rateLimits();

  const byPlatform = PLATFORMS.reduce<Record<Platform, SocialAccount[]>>((acc, p) => {
    acc[p] = accounts.filter((a) => a.platform === p);
    return acc;
  }, {} as Record<Platform, SocialAccount[]>);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Cuentas conectadas
        </h3>
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
                  <h4 className="text-sm font-semibold">{platformLabel[p].toUpperCase()}</h4>
                  <button type="button" className="btn-secondary text-xs">
                    <Plus className="size-3" /> Añadir otra cuenta de {platformLabel[p]}
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
                              {acc.platformIgUserId && <span>· IG ID: {acc.platformIgUserId}</span>}
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
                              accountStatusColor[acc.status],
                            )}
                          >
                            {accountStatusLabel[acc.status]}
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
                          <button type="button" className="btn-secondary text-xs">
                            <RefreshCw className="size-3" /> Reconectar
                          </button>
                          <button type="button" className="btn-ghost text-xs">
                            <Trash2 className="size-3" /> Desconectar
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
            Modo manual avanzado — pegar tokens
          </summary>
          <p className="mt-2 text-xs text-ink-muted">
            Para cuando el App Review tarda y necesitas operar ya. Pega el access
            token, el refresh token y los IDs. La app validará con un ping antes de
            guardar.
          </p>
        </details>
      </section>
    </div>
  );
}
