import { ExternalLink, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { sync, workspacesWithCounts } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountChip } from "@/components/ui/PlatformBadge";
import { timeAgo } from "@/lib/utils";

export function WorkspacesPage() {
  const workspaces = workspacesWithCounts();

  return (
    <div>
      <PageHeader
        title="Mis workspaces"
        description="Gestiona tus espacios de trabajo. Cada workspace tiene su propio Brand Brain, cuentas sociales y calendario."
        actions={
          <Link to="/workspaces/new" className="btn-primary">
            <Plus className="size-4" /> Nuevo workspace
          </Link>
        }
      />
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((w) => {
          const accounts = sync.accounts(w.id);
          return (
            <div key={w.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start gap-2">
                <span
                  className="mt-1.5 size-3 rounded-full"
                  style={{ backgroundColor: w.brandColorPrimary }}
                />
                <div className="flex-1">
                  <div className="font-semibold">{w.name}</div>
                  <div className="text-xs text-ink-muted">
                    {labelForType(w.type)} ·{" "}
                    <span className="capitalize">{w.status}</span>
                  </div>
                </div>
              </div>
              {w.description && (
                <p className="text-sm text-ink-muted line-clamp-2">{w.description}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {accounts.slice(0, 3).map((a) => (
                  <AccountChip key={a.id} accountId={a.id} />
                ))}
                {accounts.length > 3 && (
                  <span className="pill bg-hover text-ink-muted">
                    +{accounts.length - 3} más
                  </span>
                )}
              </div>
              <div className="mt-auto space-y-1 text-sm">
                <div>
                  {w.pendingCount > 0 ? (
                    <span className="text-amber-400">
                      {w.pendingCount} pendiente{w.pendingCount === 1 ? "" : "s"} 🔴
                    </span>
                  ) : (
                    <span className="text-emerald-400">Cola limpia ✅</span>
                  )}
                </div>
                <div className="text-xs text-ink-muted">
                  Última publicación {timeAgo(w.lastPublishedAt)}
                </div>
              </div>
              <div className="flex gap-2 border-t border-border pt-3">
                <Link
                  to={`/w/${w.slug}/dashboard`}
                  className="btn-primary flex-1"
                >
                  Abrir <ExternalLink className="size-3.5" />
                </Link>
                <Link
                  to={`/w/${w.slug}/settings/general`}
                  className="btn-secondary"
                  aria-label="Settings"
                >
                  <Settings className="size-4" />
                </Link>
              </div>
            </div>
          );
        })}
        <Link
          to="/workspaces/new"
          className="card flex min-h-[200px] flex-col items-center justify-center gap-2 text-ink-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <Plus className="size-6" />
          <span className="font-medium">Nuevo workspace</span>
        </Link>
      </div>
    </div>
  );
}

function labelForType(t: string) {
  return { brand: "Marca", personal: "Personal", client: "Cliente", other: "Otro" }[t] ?? t;
}
