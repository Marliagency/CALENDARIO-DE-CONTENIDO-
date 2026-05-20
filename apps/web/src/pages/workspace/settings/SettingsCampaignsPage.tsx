import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { formatDate, formatNumber } from "@/lib/utils";

export function SettingsCampaignsPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  if (!ws) return null;
  const campaigns = sync.campaigns(ws.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Campañas</h3>
        <button type="button" className="btn-primary">
          <Plus className="size-4" /> Nueva campaña
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-muted">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Objetivo</th>
              <th className="px-3 py-2 font-medium">KPI</th>
              <th className="px-3 py-2 font-medium">Periodo</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{c.name}</td>
                <td className="px-3 py-2.5">{c.objective}</td>
                <td className="px-3 py-2.5">
                  {c.kpiName} · {formatNumber(c.kpiTarget)}
                </td>
                <td className="px-3 py-2.5 text-xs text-ink-muted">
                  {formatDate(c.startAt)} → {formatDate(c.endAt)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="pill bg-emerald-500/15 text-emerald-400">
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
