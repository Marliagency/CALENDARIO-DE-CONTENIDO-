import {
  Facebook,
  Instagram,
  Key,
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
  linkedin: ["image", "post"],
  pinterest: ["image"],
  twitter_x: ["post", "image"],
};

// Plataformas con publishing real implementado (sin App Review gracias al
// Developer Mode de Meta y el OAuth estándar de LinkedIn/Twitter).
const REAL_PUBLISH_READY: Platform[] = ["instagram", "facebook", "linkedin", "twitter_x"];

type ModalMode = "dev-connect" | "real-token";

export function SettingsConnectionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  const [connectPlatform, setConnectPlatform] = useState<Platform | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("real-token");
  const [updateTokenAccount, setUpdateTokenAccount] =
    useState<SocialAccount | null>(null);
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
        `Desconectar @${acc.handle} (${platformLabel[acc.platform]})? Esta accion no se puede deshacer.`,
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
        "En modo mock no se pueden conectar cuentas reales. Arranca la API con pnpm dev:api y pon VITE_MOCK_API=0.",
      );
      return;
    }
    setError(null);
    try {
      const res = await http.oauthStart(platform, slug ?? "");
      if (res.configured && res.url) {
        window.open(res.url, "oauth", "width=560,height=720");
        return;
      }
    } catch {
      /* caemos al modal manual */
    }
    const defaultMode: ModalMode = REAL_PUBLISH_READY.includes(platform)
      ? "real-token"
      : "dev-connect";
    setModalMode(defaultMode);
    setConnectPlatform(platform);
  }

  async function afterConnect() {
    setConnectPlatform(null);
    setUpdateTokenAccount(null);
    if (slug) {
      await dataCache.refetchAccounts(slug);
      forceRender((n) => n + 1);
    }
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
              Modo mock — conexion real requiere VITE_MOCK_API=0
            </span>
          )}
        </div>
        {accounts.length === 0 ? (
          <p className="card px-4 py-6 text-sm text-ink-muted">
            Aun no hay cuentas conectadas. Conecta la primera abajo.
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
                    <Plus className="size-3" /> Añadir otra cuenta
                  </button>
                </div>
                <div className="space-y-2">
                  {byPlatform[p].map((acc) => {
                    const limit = limits.find(
                      (l) =>
                        l.socialAccountId === acc.id &&
                        l.date === new Date().toISOString().slice(0, 10),
                    );
                    const isDevToken =
                      !acc.platformIgUserId &&
                      !acc.platformPageId &&
                      !acc.platformUserId &&
                      (p === "instagram" || p === "facebook" || p === "linkedin" || p === "twitter_x");
                    return (
                      <div key={acc.id} className="card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{acc.handle}</span>
                              {isDevToken && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400">
                                  token dummy
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                              <span>{acc.nickname}</span>
                              {acc.platformIgUserId && (
                                <span>· IG ID: {acc.platformIgUserId}</span>
                              )}
                              {acc.platformPageId && (
                                <span>· Page ID: {acc.platformPageId}</span>
                              )}
                              {acc.platformUserId && (
                                <span>· User ID: {acc.platformUserId}</span>
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
                                  width: `${Math.min(100, (limit.postsUsed / limit.postsLimit) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {acc.lastError && (
                          <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                            {acc.lastError}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {REAL_PUBLISH_READY.includes(acc.platform) && (
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              onClick={() => setUpdateTokenAccount(acc)}
                            >
                              <Key className="size-3" /> Actualizar token
                            </button>
                          )}
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
            const isReady = REAL_PUBLISH_READY.includes(p);
            return (
              <button
                key={p}
                type="button"
                className="card flex flex-col items-center gap-2 p-4 transition-colors hover:bg-hover"
                onClick={() => connect(p)}
              >
                <Icon className="size-6" />
                <div className="text-sm font-medium">{platformLabel[p]}</div>
                <div
                  className={cn(
                    "text-[11px]",
                    isReady ? "text-emerald-400" : "text-ink-muted",
                  )}
                >
                  {isReady ? "publica hoy" : "requiere App Review"}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {connectPlatform && (
        <ConnectModal
          platform={connectPlatform}
          workspaceSlug={slug ?? ""}
          initialMode={modalMode}
          onClose={() => setConnectPlatform(null)}
          onConnected={afterConnect}
        />
      )}

      {updateTokenAccount && (
        <TokenUpdateModal
          account={updateTokenAccount}
          workspaceSlug={slug ?? ""}
          onClose={() => setUpdateTokenAccount(null)}
          onUpdated={afterConnect}
        />
      )}
    </div>
  );
}

// ---------- ConnectModal ----------

function ConnectModal({
  platform,
  workspaceSlug,
  initialMode,
  onClose,
  onConnected,
}: {
  platform: Platform;
  workspaceSlug: string;
  initialMode: ModalMode;
  onClose: () => void;
  onConnected: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [nickname, setNickname] = useState("");
  const [handle, setHandle] = useState("");
  const [formats, setFormats] = useState<string[]>(
    FORMATS_BY_PLATFORM[platform].slice(0, 1),
  );
  const [accessToken, setAccessToken] = useState("");
  const [platformIdValue, setPlatformIdValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFormat(f: string) {
    setFormats((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  async function submitDevConnect() {
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

  async function submitRealToken() {
    setSubmitting(true);
    setError(null);
    try {
      // Paso 1: crear la cuenta con dev-connect (tokens dummy)
      const created = await http.devConnect({
        workspaceSlug,
        platform,
        nickname,
        handle: handle.replace(/^@/, ""),
        activeFormats: formats,
      });
      // Paso 2: actualizar con el token real
      await http.updateToken({
        workspaceSlug,
        accountId: created.id,
        accessToken: accessToken.trim(),
        ...(platformIdKey(platform) === "platformIgUserId"
          ? { platformIgUserId: platformIdValue.trim() }
          : platformIdKey(platform) === "platformPageId"
            ? { platformPageId: platformIdValue.trim() }
            : { platformUserId: platformIdValue.trim() }),
      });
      await onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    nickname.trim().length > 0 &&
    handle.trim().length > 0 &&
    formats.length > 0 &&
    (mode === "dev-connect" || (accessToken.trim().length > 5 && platformIdValue.trim().length > 0));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              Conectar cuenta de {platformLabel[platform]}
            </h3>
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

        {REAL_PUBLISH_READY.includes(platform) && (
          <div className="mb-4 flex rounded-lg bg-hover p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("real-token")}
              className={cn(
                "flex-1 rounded-md py-1.5 font-medium transition-colors",
                mode === "real-token"
                  ? "bg-surface text-ink shadow"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              Con token real (publica de verdad)
            </button>
            <button
              type="button"
              onClick={() => setMode("dev-connect")}
              className={cn(
                "flex-1 rounded-md py-1.5 font-medium transition-colors",
                mode === "dev-connect"
                  ? "bg-surface text-ink shadow"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              Solo probar (token dummy)
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">Nickname interno</label>
              <input
                className="input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="QYRO Instagram"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="label">Handle publico</label>
              <input
                className="input"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@qyro.app"
              />
            </div>
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

          {mode === "real-token" && (
            <>
              <hr className="border-border" />
              <PlatformTokenFields
                platform={platform}
                accessToken={accessToken}
                onAccessToken={setAccessToken}
                platformId={platformIdValue}
                onPlatformId={setPlatformIdValue}
              />
            </>
          )}
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
            onClick={
              mode === "real-token" ? submitRealToken : submitDevConnect
            }
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {mode === "real-token" ? "Conectar y guardar token" : "Conectar (modo prueba)"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- TokenUpdateModal ----------

function TokenUpdateModal({
  account,
  workspaceSlug,
  onClose,
  onUpdated,
}: {
  account: SocialAccount;
  workspaceSlug: string;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}) {
  const [accessToken, setAccessToken] = useState("");
  const [platformIdValue, setPlatformIdValue] = useState(
    account.platformIgUserId ??
      account.platformPageId ??
      account.platformUserId ??
      "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = platformIdKey(account.platform);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await http.updateToken({
        workspaceSlug,
        accountId: account.id,
        accessToken: accessToken.trim(),
        ...(key === "platformIgUserId"
          ? { platformIgUserId: platformIdValue.trim() }
          : key === "platformPageId"
            ? { platformPageId: platformIdValue.trim() }
            : { platformUserId: platformIdValue.trim() }),
      });
      await onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-lg p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              Actualizar token — {account.handle}
            </h3>
            <p className="text-xs text-ink-muted">
              {platformLabel[account.platform]}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <PlatformTokenFields
            platform={account.platform}
            accessToken={accessToken}
            onAccessToken={setAccessToken}
            platformId={platformIdValue}
            onPlatformId={setPlatformIdValue}
          />
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
            disabled={accessToken.trim().length < 5 || submitting}
            onClick={submit}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Guardar token
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Componente de campos de token por plataforma ----------

function PlatformTokenFields({
  platform,
  accessToken,
  onAccessToken,
  platformId,
  onPlatformId,
}: {
  platform: string;
  accessToken: string;
  onAccessToken: (v: string) => void;
  platformId: string;
  onPlatformId: (v: string) => void;
}) {
  const configs: Record<
    string,
    {
      idLabel: string;
      idPlaceholder: string;
      instructions: React.ReactNode;
      tokenLabel: string;
    }
  > = {
    instagram: {
      tokenLabel: "Access token (Graph API)",
      idLabel: "Instagram User ID (numerico)",
      idPlaceholder: "17841400455970040",
      instructions: (
        <ol className="space-y-1 text-xs text-ink-muted">
          <li>1. Ve a <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-ws underline">developers.facebook.com</a> y crea una App (tipo: Business)</li>
          <li>2. Añade el producto <strong className="text-ink">Instagram</strong> y linkea tu cuenta de Instagram</li>
          <li>3. En <strong className="text-ink">Graph API Explorer</strong>, genera un token con permisos: <code className="text-[10px]">instagram_basic, instagram_content_publish, pages_show_list</code></li>
          <li>4. Haz clic en <strong className="text-ink">Generate Access Token</strong> y autoriza con tu cuenta</li>
          <li>5. Para obtener tu Instagram User ID: llama a <code className="text-[10px]">GET /me/accounts?fields=instagram_business_account</code></li>
          <li>6. Pega el token y el ID aqui</li>
        </ol>
      ),
    },
    facebook: {
      tokenLabel: "Page Access Token",
      idLabel: "Facebook Page ID (numerico)",
      idPlaceholder: "123456789012345",
      instructions: (
        <ol className="space-y-1 text-xs text-ink-muted">
          <li>1. Ve a <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-ws underline">developers.facebook.com</a> y crea una App</li>
          <li>2. En <strong className="text-ink">Graph API Explorer</strong>, genera token con permisos: <code className="text-[10px]">pages_manage_posts, pages_read_engagement</code></li>
          <li>3. Haz click en tu usuario (arriba derecha) y selecciona tu <strong className="text-ink">pagina</strong> para obtener el Page Access Token</li>
          <li>4. El Page ID aparece en la URL de tu pagina de Facebook o en <code className="text-[10px]">GET /me/accounts</code></li>
        </ol>
      ),
    },
    linkedin: {
      tokenLabel: "Access token de LinkedIn",
      idLabel: "LinkedIn Person URN (sub del token)",
      idPlaceholder: "urn:li:person:ABC123...",
      instructions: (
        <ol className="space-y-1 text-xs text-ink-muted">
          <li>1. Ve a <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer" className="text-ws underline">linkedin.com/developers/apps</a> y crea una App</li>
          <li>2. En <strong className="text-ink">Auth</strong>, añade permisos: <code className="text-[10px]">openid, profile, w_member_social</code></li>
          <li>3. Usa el <strong className="text-ink">OAuth 2.0 token generator</strong> en la app para generar un token</li>
          <li>4. Llama a <code className="text-[10px]">GET https://api.linkedin.com/v2/userinfo</code> con el token para obtener tu <code className="text-[10px]">sub</code></li>
          <li>5. El Person URN es <code className="text-[10px]">urn:li:person:{"{{sub}}"}</code></li>
        </ol>
      ),
    },
    twitter_x: {
      tokenLabel: "Bearer token (OAuth 2.0)",
      idLabel: "Twitter User ID (numerico)",
      idPlaceholder: "1234567890",
      instructions: (
        <ol className="space-y-1 text-xs text-ink-muted">
          <li>1. Ve a <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noreferrer" className="text-ws underline">developer.twitter.com</a> y crea un proyecto (Free tier)</li>
          <li>2. En tu App, activa <strong className="text-ink">OAuth 2.0</strong> con tipo de usuario <strong className="text-ink">User authentication settings</strong></li>
          <li>3. Genera un OAuth 2.0 token con scopes: <code className="text-[10px]">tweet.write, tweet.read, users.read, offline.access</code></li>
          <li>4. Tu User ID aparece en <code className="text-[10px]">GET https://api.twitter.com/2/users/me</code></li>
        </ol>
      ),
    },
  };

  const cfg = configs[platform];
  if (!cfg) return null;

  return (
    <>
      <div className="rounded-md bg-hover/50 p-3">
        <p className="mb-2 text-xs font-semibold text-ink">
          Como obtener el token de {platformLabel[platform as Platform]}
        </p>
        {cfg.instructions}
      </div>
      <div className="space-y-1">
        <label className="label">{cfg.tokenLabel}</label>
        <textarea
          className="input min-h-[70px] font-mono text-xs"
          value={accessToken}
          onChange={(e) => onAccessToken(e.target.value)}
          placeholder="Pega aqui el access token..."
          spellCheck={false}
        />
      </div>
      <div className="space-y-1">
        <label className="label">{cfg.idLabel}</label>
        <input
          className="input font-mono text-xs"
          value={platformId}
          onChange={(e) => onPlatformId(e.target.value)}
          placeholder={cfg.idPlaceholder}
        />
      </div>
    </>
  );
}

function platformIdKey(
  platform: string,
): "platformIgUserId" | "platformPageId" | "platformUserId" {
  if (platform === "instagram") return "platformIgUserId";
  if (platform === "facebook") return "platformPageId";
  return "platformUserId";
}
