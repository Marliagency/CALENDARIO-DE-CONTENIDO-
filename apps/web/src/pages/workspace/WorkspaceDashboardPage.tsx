import { Calendar, Check } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiPill } from "@/components/ui/KpiPill";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { AccountChip } from "@/components/ui/PlatformBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { formatDateTime, formatEur, formatNumber, formatPercent } from "@/lib/utils";

export function WorkspaceDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = slug ? sync.workspace(slug) : undefined;
  if (!ws) return <NotFoundPage />;

  const daily = sync.dailyMetrics(ws.id);
  const accounts = sync.accountMetrics(ws.id);
  const formats = sync.formatMetrics(ws.id);
  const pieces = sync.pieces(ws.id);
  const variants = sync.variantsForWorkspace(ws.id);

  const totalReach = daily.reduce((s, d) => s + d.reach, 0);
  const totalImpressions = daily.reduce((s, d) => s + d.impressions, 0);
  const avgEng = daily.reduce((s, d) => s + d.engagementRate, 0) / Math.max(daily.length, 1);
  const totalPublished = daily.reduce((s, d) => s + d.publishedCount, 0);
  const totalBoost = daily.reduce((s, d) => s + d.boostSpendEur, 0);

  const lineData = daily.map((d) => ({
    x: d.date.slice(5),
    y: d.reach,
    boost: d.boostSpendEur,
  }));

  const accountBars = accounts.map((m) => {
    const acc = sync.accounts(ws.id).find((a) => a.id === m.socialAccountId);
    return {
      label: acc?.handle ?? m.socialAccountId,
      sublabel: acc?.platform,
      organic: m.organicReach,
      paid: m.paidReach,
    };
  });

  // Top 5
  const topPieces = [...variants]
    .filter((v) => v.status === "published")
    .slice(0, 5);

  const pendingPieces = pieces
    .filter((p) => p.status === "in_review")
    .slice(0, 3);

  const upcoming = variants
    .filter((v) => v.status === "scheduled" || v.status === "pending")
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
    .slice(0, 5);

  const activeBoosts = variants.filter((v) => v.boostEnabled && v.boostBudgetEur > 0);

  const bestFormat = [...formats].sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0];
  const worstFormat = [...formats].sort((a, b) => a.avgEngagementRate - b.avgEngagementRate)[0];

  return (
    <div>
      <PageHeader
        title={`${ws.name} — Dashboard`}
        description="Rendimiento general del workspace. Datos mock representativos de los últimos 7 días."
        actions={
          <>
            <select className="input w-auto">
              <option>Últimos 7 días</option>
              <option>Últimos 30 días</option>
              <option>Trimestre actual</option>
            </select>
            <button type="button" className="btn-secondary">
              Exportar PDF
            </button>
          </>
        }
      />

      <div className="space-y-6 p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <KpiPill label="Alcance" value={formatNumber(totalReach)} delta={12.4} />
          <KpiPill label="Impresiones" value={formatNumber(totalImpressions)} delta={9.1} />
          <KpiPill label="Engagement" value={formatPercent(avgEng)} delta={3.2} />
          <KpiPill label="Publicadas" value={String(totalPublished)} delta={-5} />
          <KpiPill label="Boost gastado" value={formatEur(totalBoost)} delta={20} />
          <KpiPill label="CPM medio" value="3,80€" delta={-2.1} />
          <KpiPill label="Seguidores +" value="+184" delta={14} />
        </div>

        {/* Gráficas */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Alcance por día</h3>
            <LineChart data={lineData} yLabel="Alcance por día" />
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Por cuenta — orgánico vs boost</h3>
            <BarChart data={accountBars} />
          </div>
        </div>

        {/* Performance por formato */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Performance por formato</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-ink-muted">
                  <th className="px-3 py-2 font-medium">Formato</th>
                  <th className="px-3 py-2 font-medium text-right">Piezas</th>
                  <th className="px-3 py-2 font-medium text-right">Alcance medio</th>
                  <th className="px-3 py-2 font-medium text-right">Engagement</th>
                  <th className="px-3 py-2 font-medium text-right">Completion</th>
                  <th className="px-3 py-2 font-medium text-right">CPM</th>
                </tr>
              </thead>
              <tbody>
                {formats.map((f) => (
                  <tr key={f.format} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2.5 font-medium">{f.format}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{f.count}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatNumber(f.avgReach)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatPercent(f.avgEngagementRate)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {f.avgCompletionRate > 0 ? `${f.avgCompletionRate}%` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {f.cpmCents ? `${(f.cpmCents / 100).toFixed(2)}€` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bestFormat && worstFormat && (
            <div className="mt-3 rounded-md bg-hover px-3 py-2 text-xs text-ink-muted">
              💡 <strong className="text-ink">{bestFormat.format}</strong> genera{" "}
              <strong className="text-ink">
                {(bestFormat.avgReach / Math.max(worstFormat.avgReach, 1)).toFixed(1)}×
              </strong>{" "}
              más alcance que <strong className="text-ink">{worstFormat.format}</strong>.
            </div>
          )}
        </div>

        {/* Widgets row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Top 5 piezas</h3>
            <div className="space-y-2">
              {topPieces.length === 0 ? (
                <div className="text-sm text-ink-muted">
                  Aún no hay piezas publicadas con métricas.
                </div>
              ) : (
                topPieces.map((v) => {
                  const piece = pieces.find((p) => p.id === v.contentPieceId);
                  return (
                    <Link
                      key={v.id}
                      to={`/w/${ws.slug}/queue/review?piece=${v.contentPieceId}`}
                      className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-hover"
                    >
                      <span className="grid size-10 place-items-center rounded-md bg-hover text-xs">
                        🎥
                      </span>
                      <div className="flex-1 truncate">
                        <div className="truncate font-medium">{piece?.title}</div>
                        <div className="text-xs text-ink-muted">
                          {formatNumber(8200)} alcance · 4.2% eng.
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Cola rápida</h3>
            <div className="space-y-2">
              {pendingPieces.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <Check className="size-4" /> Cola limpia
                </div>
              ) : (
                pendingPieces.map((p) => (
                  <div key={p.id} className="rounded-md border border-border p-2">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <StatusPill status={p.status} />
                      <Link
                        to={`/w/${ws.slug}/queue/review?piece=${p.id}`}
                        className="text-xs text-ws hover:underline"
                      >
                        Revisar →
                      </Link>
                    </div>
                  </div>
                ))
              )}
              {pendingPieces.length > 0 && (
                <Link
                  to={`/w/${ws.slug}/queue`}
                  className="block pt-1 text-center text-xs text-ws hover:underline"
                >
                  Ver toda la cola →
                </Link>
              )}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Próximas publicaciones</h3>
            <div className="space-y-2">
              {upcoming.length === 0 ? (
                <div className="text-sm text-ink-muted">Nada programado.</div>
              ) : (
                upcoming.map((v) => {
                  const piece = pieces.find((p) => p.id === v.contentPieceId);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-hover"
                    >
                      <Calendar className="size-4 text-ink-muted" />
                      <div className="flex-1 truncate">
                        <div className="truncate text-xs font-medium">
                          {piece?.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                          {formatDateTime(v.scheduledAt)}
                        </div>
                      </div>
                      <AccountChip accountId={v.socialAccountId} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Boost activo */}
        {activeBoosts.length > 0 && (
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Boost activo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-ink-muted">
                    <th className="px-3 py-2 font-medium">Pieza</th>
                    <th className="px-3 py-2 font-medium">Plataforma</th>
                    <th className="px-3 py-2 font-medium text-right">Presupuesto</th>
                    <th className="px-3 py-2 font-medium text-right">Días</th>
                    <th className="px-3 py-2 font-medium text-right">Diario</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBoosts.map((v) => {
                    const piece = pieces.find((p) => p.id === v.contentPieceId);
                    return (
                      <tr key={v.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2.5">{piece?.title}</td>
                        <td className="px-3 py-2.5">
                          <AccountChip accountId={v.socialAccountId} />
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatEur(v.boostBudgetEur)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {v.boostDurationDays ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {v.boostDailyBudgetEur != null
                            ? formatEur(v.boostDailyBudgetEur)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
