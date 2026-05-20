import { Bell, ChevronDown, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { cn, getInitials } from "@/lib/utils";
import type { Workspace } from "@pulse/types";

interface AppHeaderProps {
  workspace?: Workspace | null;
  onOpenSwitcher: () => void;
  onToggleSidebar?: () => void;
}

export function AppHeader({ workspace, onOpenSwitcher, onToggleSidebar }: AppHeaderProps) {
  const user = sync.user();
  const location = useLocation();

  const sectionTitle = useSectionTitle(location.pathname, workspace?.name);

  return (
    <header className="relative border-b border-border bg-surface">
      {/* Franja del color del workspace */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: "var(--ws-primary)" }}
      />
      <div className="flex h-14 items-center justify-between gap-4 px-4 pt-[3px]">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="btn-ghost lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSwitcher}
            className="flex items-center gap-2 rounded-md border border-border bg-base px-3 py-1.5 text-sm font-medium hover:bg-hover"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: workspace?.brandColorPrimary ?? "#94A3B8" }}
            />
            {workspace ? workspace.name : "Todos los workspaces"}
            <ChevronDown className="size-3.5 text-ink-muted" />
          </button>
          <div className="hidden text-sm text-ink-muted md:block">/ {sectionTitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative btn-ghost"
            aria-label="Notificaciones"
          >
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-400" />
          </button>
          <Link
            to="/account/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-hover"
          >
            <span className="grid size-7 place-items-center rounded-full bg-ws text-white text-xs font-semibold">
              {getInitials(user.name)}
            </span>
            <span className="hidden md:inline">{user.name}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function useSectionTitle(pathname: string, workspaceName?: string): string {
  if (pathname.startsWith("/overview")) return "Dashboard global";
  if (pathname === "/calendar") return "Calendario global";
  if (pathname.startsWith("/workspaces")) return "Gestión de workspaces";
  if (pathname.startsWith("/account")) return "Mi cuenta";

  if (pathname.includes("/dashboard")) return `${workspaceName ?? ""} · Dashboard`;
  if (pathname.includes("/calendar")) return `${workspaceName ?? ""} · Calendario`;
  if (pathname.includes("/queue")) return `${workspaceName ?? ""} · Cola`;
  if (pathname.includes("/brain")) return `${workspaceName ?? ""} · Brand Brain`;
  if (pathname.includes("/analytics")) return `${workspaceName ?? ""} · Analytics`;
  if (pathname.includes("/settings/connections")) return `${workspaceName ?? ""} · Conexiones`;
  if (pathname.includes("/settings/personas")) return `${workspaceName ?? ""} · Personas`;
  if (pathname.includes("/settings/audiences")) return `${workspaceName ?? ""} · Audiencias`;
  if (pathname.includes("/settings/campaigns")) return `${workspaceName ?? ""} · Campañas`;
  if (pathname.includes("/settings/qc-rules")) return `${workspaceName ?? ""} · Reglas QC`;
  if (pathname.includes("/settings/notifications")) return `${workspaceName ?? ""} · Notificaciones`;
  if (pathname.includes("/settings/api-keys")) return `${workspaceName ?? ""} · API Keys`;
  if (pathname.includes("/settings")) return `${workspaceName ?? ""} · Settings`;
  return "";
}

// Helper para combinar clases — re-exportado por conveniencia
export { cn };
