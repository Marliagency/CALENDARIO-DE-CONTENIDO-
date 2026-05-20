import { NavLink, Outlet, useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "connections", label: "Conexiones" },
  { id: "personas", label: "Buyer personas" },
  { id: "audiences", label: "Audiencias (boost)" },
  { id: "campaigns", label: "Campañas" },
  { id: "qc-rules", label: "Reglas QC" },
  { id: "notifications", label: "Notificaciones" },
  { id: "api-keys", label: "API Keys" },
];

export function SettingsLayout() {
  const { slug } = useParams<{ slug: string }>();
  const ws = slug ? sync.workspace(slug) : undefined;
  if (!ws) return <NotFoundPage />;

  return (
    <div>
      <PageHeader title={`${ws.name} · Settings`} />
      <div className="flex flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-56 shrink-0">
          <nav className="card flex flex-col p-2">
            {SECTIONS.map((s) => (
              <NavLink
                key={s.id}
                to={`/w/${slug}/settings/${s.id}`}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-hover text-ink"
                      : "text-ink-muted hover:bg-hover hover:text-ink",
                  )
                }
              >
                {s.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
