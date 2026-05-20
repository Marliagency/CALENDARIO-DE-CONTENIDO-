import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { formatNumber, formatPercent } from "@/lib/utils";
import { KpiPill } from "@/components/ui/KpiPill";

export function AnalyticsPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = slug ? sync.workspace(slug) : undefined;
  if (!ws) return <NotFoundPage />;

  const daily = sync.dailyMetrics(ws.id);
  const accounts = sync.accountMetrics(ws.id);
  const formats = sync.formatMetrics(ws.id);

  const totalReach = daily.reduce((s, d) => s + d.reach, 0);
  const avgEng = daily.reduce((s, d) => s + d.engagementRate, 0) / Math.max(daily.length, 1);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Análisis detallado de rendimiento del workspace."
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiPill label="Alcance total" value={formatNumber(totalReach)} delta={12.4} />
          <KpiPill label="Engagement medio" value={formatPercent(avgEng)} delta={3.2} />
          <KpiPill label="CTR medio" value="2.4%" delta={-1.0} />
          <KpiPill label="Save rate" value="3.1%" delta={5.0} />
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Alcance vs impresiones — últimos 7 días</h3>
          <LineChart
            data={daily.map((d) => ({ x: d.date.slice(5), y: d.reach, boost: d.boostSpendEur }))}
            yLabel="Alcance diario"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Por cuenta</h3>
            <BarChart
              data={accounts.map((m) => {
                const acc = sync.accounts(ws.id).find((a) => a.id === m.socialAccountId);
                return {
                  label: acc?.handle ?? m.socialAccountId,
                  sublabel: acc?.platform,
                  organic: m.organicReach,
                  paid: m.paidReach,
                };
              })}
            />
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Por formato</h3>
            <BarChart
              data={formats.map((f) => ({
                label: f.format,
                sublabel: `${f.count} piezas`,
                organic: f.avgReach,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
