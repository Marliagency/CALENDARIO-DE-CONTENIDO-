import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";

export function SettingsAudiencesPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  if (!ws) return null;
  const audiences = sync.audiences(ws.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Audiencias de boost</h3>
        <button type="button" className="btn-primary">
          <Plus className="size-4" /> Nueva audiencia
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {audiences.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="font-semibold">{a.name}</div>
              {a.platform && <span className="pill bg-hover">{a.platform}</span>}
            </div>
            <dl className="mt-3 space-y-1 text-xs">
              <DRow label="Geo">{a.geo.join(", ")}</DRow>
              <DRow label="Edad">{`${a.ageMin}-${a.ageMax}`}</DRow>
              <DRow label="Idiomas">{a.languages.join(", ")}</DRow>
              <DRow label="Intereses">{a.interests.join(", ")}</DRow>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function DRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
