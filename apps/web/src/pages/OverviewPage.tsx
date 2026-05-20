import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { sync, workspacesWithCounts } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { AccountChip } from "@/components/ui/PlatformBadge";
import { cn, formatEur, formatNumber, formatPercent, timeAgo } from "@/lib/utils";

export function OverviewPage() {
  const user = sync.user();
  const workspaces = workspacesWithCounts();
  const allAccounts = sync.allAccounts();
  const allVariants = sync.allVariants();
  const allPieces = sync.allPieces();

  // Alertas — tokens próximos a caducar, rate limits, etc.
  const alerts = allAccounts
    .filter((a) => a.status !== "healthy")
    .map((a) => ({
      id: a.id,
      severity: a.status === "needs_reauth" ? "warning" : "error",
      message: a.lastError ?? `Cuenta ${a.handle} requiere atención`,
      account: a,
    }));

  // Publicaciones de hoy (todos los workspaces)
  const today = new Date().toISOString().slice(0, 10);
  const todays = allVariants
    .filter((v) => v.scheduledAt?.startsWith(today))
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
    .slice(0, 6);

  // Métricas semana — agregadas por workspace
  const weekMetrics = workspaces.map((w) => {
    const daily = sync.dailyMetrics(w.id);
    const reach = daily.reduce((s, d) => s + d.reach, 0);
    const eng = daily.reduce((s, d) => s + d.engagementRate, 0) / Math.max(daily.length, 1);
    const published = daily.reduce((s, d) => s + d.publishedCount, 0);
    const boost = daily.reduce((s, d) => s + d.boostSpendEur, 0);
    return { workspace: w, reach, eng, published, boost };
  });

  return (
    <div>
      <PageHeader
        title={`Buenos días, ${user.name}`}
        description={`Hoy es ${new Intl.DateTimeFormat("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}.`}
      />

      <div className="space-y-6 p-6">
        {alerts.length > 0 && (
          <section>
            <SectionTitle>Alertas</SectionTitle>
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="card flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={cn(
                        "size-4 mt-0.5",
                        a.severity === "error" ? "text-red-400" : "text-amber-400",
                      )}
                    />
                    <div>
                      <div className="text-sm font-medium">{a.message}</div>
                      <div className="mt-0.5 text-xs text-ink-muted">
                        {a.account.nickname} · {a.account.handle}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/w/${
                      workspaces.find((w) => w.id === a.account.workspaceId)?.slug
                    }/settings/connections`}
                    className="btn-secondary"
                  >
                    Ver detalle <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Mis workspaces · estado rápido</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((w) => (
              <Link
                key={w.id}
                to={`/w/${w.slug}/dashboard`}
                className="card group flex flex-col gap-2 p-4 transition-colors hover:bg-hover"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: w.brandColorPrimary }}
                  />
                  <span className="font-semibold">{w.name}</span>
                  <span className="ml-auto text-xs text-ink-muted">
                    {w.accountCount} cuentas
                  </span>
                </div>
                <div className="text-sm text-ink-muted">
                  {w.pendingCount > 0 ? (
                    <span className="text-amber-400">
                      {w.pendingCount} pendiente{w.pendingCount === 1 ? "" : "s"} de revisar
                    </span>
                  ) : (
                    "Cola limpia ✅"
                  )}
                </div>
                <div className="text-xs text-ink-muted">
                  Última publicación {timeAgo(w.lastPublishedAt)}
                </div>
              </Link>
            ))}
            <Link
              to="/workspaces/new"
              className="card flex flex-col items-center justify-center gap-1 p-4 text-ink-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <Plus className="size-5" />
              <span className="text-sm font-medium">Nuevo workspace</span>
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <SectionTitle>Publicaciones hoy</SectionTitle>
            {todays.length === 0 ? (
              <div className="card px-4 py-6 text-sm text-ink-muted">
                Sin publicaciones programadas para hoy.
              </div>
            ) : (
              <div className="card divide-y divide-border">
                {todays.map((v) => {
                  const ws = workspaces.find((w) => w.id === v.workspaceId);
                  const piece = allPieces.find((p) => p.id === v.contentPieceId);
                  return (
                    <div key={v.id} className="flex items-center gap-3 p-3">
                      <div className="w-12 text-sm font-mono tabular-nums">
                        {v.scheduledAt?.slice(11, 16)}
                      </div>
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: ws?.brandColorPrimary }}
                      />
                      <div className="flex-1 truncate">
                        <div className="truncate text-sm font-medium">{piece?.title}</div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <AccountChip accountId={v.socialAccountId} />
                          <StatusPill status={v.status} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <SectionTitle>Métricas esta semana</SectionTitle>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-base/50 text-left text-xs text-ink-muted">
                    <th className="px-3 py-2 font-medium">Workspace</th>
                    <th className="px-3 py-2 font-medium">Pub.</th>
                    <th className="px-3 py-2 font-medium">Alcance</th>
                    <th className="px-3 py-2 font-medium">Eng. %</th>
                    <th className="px-3 py-2 font-medium">Boost</th>
                  </tr>
                </thead>
                <tbody>
                  {weekMetrics.map((m) => (
                    <tr key={m.workspace.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: m.workspace.brandColorPrimary }}
                          />
                          {m.workspace.name}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{m.published}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatNumber(m.reach)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatPercent(m.eng)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatEur(m.boost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
      {children}
    </h2>
  );
}
