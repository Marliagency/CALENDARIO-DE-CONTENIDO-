import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { sync } from "@/lib/api/client";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { cn } from "@/lib/utils";

export function GlobalCalendarPage() {
  const workspaces = sync.workspaces();
  const allVariants = sync.allVariants();
  const allPieces = sync.allPieces();
  const allAccounts = sync.allAccounts();

  const [activeWs, setActiveWs] = useState<Set<string>>(
    new Set(workspaces.map((w) => w.id)),
  );
  const [onlyScheduled, setOnlyScheduled] = useState(false);

  const filtered = allVariants.filter((v) => {
    if (!activeWs.has(v.workspaceId)) return false;
    if (onlyScheduled && !["scheduled", "published"].includes(v.status)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Calendario global"
        description="Vista de solo lectura con piezas de todos los workspaces. Haz click en una pieza para abrirla en su workspace."
      />
      <div className="flex flex-col gap-4 p-6 lg:flex-row">
        <aside className="lg:w-64 space-y-4">
          <div className="card p-3">
            <div className="label mb-2">Workspaces</div>
            <div className="space-y-1.5">
              {workspaces.map((w) => {
                const active = activeWs.has(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(activeWs);
                      if (active) next.delete(w.id);
                      else next.add(w.id);
                      setActiveWs(next);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors",
                      active ? "bg-hover" : "opacity-50 hover:opacity-100",
                    )}
                  >
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: w.brandColorPrimary }}
                    />
                    <span className="flex-1">{w.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyScheduled}
                onChange={(e) => setOnlyScheduled(e.target.checked)}
              />
              Solo programadas
            </label>
          </div>
        </aside>
        <div className="flex-1">
          <MonthGrid
            variants={filtered}
            pieces={allPieces}
            workspaces={workspaces}
            accounts={allAccounts}
            readonly
          />
        </div>
      </div>
    </div>
  );
}
