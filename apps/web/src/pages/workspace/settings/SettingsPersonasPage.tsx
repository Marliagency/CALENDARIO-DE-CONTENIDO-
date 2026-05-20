import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";

export function SettingsPersonasPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  if (!ws) return null;
  const personas = sync.personas(ws.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Buyer personas</h3>
        <button type="button" className="btn-primary">
          <Plus className="size-4" /> Nueva persona
        </button>
      </div>
      {personas.length === 0 ? (
        <p className="card px-4 py-6 text-sm text-ink-muted">
          Aún no hay personas definidas para este workspace.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {personas.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-ink-muted">{p.ageRange}</div>
                </div>
                {p.isProTarget && (
                  <span className="pill bg-violet-500/15 text-violet-400">Pro</span>
                )}
              </div>
              <p className="mt-2 text-sm text-ink-muted line-clamp-2">{p.demographics}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.preferredPlatforms.map((pl) => (
                  <span key={pl} className="pill bg-hover">
                    {pl}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
