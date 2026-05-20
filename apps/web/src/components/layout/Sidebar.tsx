import {
  BarChart3,
  Brain,
  Calendar,
  CalendarDays,
  Globe,
  Inbox,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { slug } = useParams<{ slug: string }>();
  const workspace = slug ? sync.workspace(slug) : undefined;

  const pendingCount = workspace
    ? sync.pieces(workspace.id).filter((p) =>
        ["in_review", "changes_requested", "ingest_rejected"].includes(p.status),
      ).length
    : 0;

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div
            className="grid size-7 place-items-center rounded-md text-white text-sm font-bold"
            style={{ backgroundColor: "var(--ws-primary)" }}
          >
            P
          </div>
          <div className="font-semibold tracking-tight">Pulse</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 text-sm">
          <SidebarSection label="Global">
            <SidebarLink to="/overview" icon={Globe} label="Resumen global" />
            <SidebarLink to="/calendar" icon={CalendarDays} label="Calendario global" />
            <SidebarLink to="/workspaces" icon={LayoutDashboard} label="Workspaces" />
          </SidebarSection>

          {workspace && (
            <SidebarSection
              label={workspace.name}
              accent={workspace.brandColorPrimary}
            >
              <SidebarLink
                to={`/w/${workspace.slug}/dashboard`}
                icon={LayoutDashboard}
                label="Dashboard"
              />
              <SidebarLink
                to={`/w/${workspace.slug}/calendar`}
                icon={Calendar}
                label="Calendario"
              />
              <SidebarLink
                to={`/w/${workspace.slug}/queue`}
                icon={Inbox}
                label="Cola"
                badge={pendingCount > 0 ? pendingCount : undefined}
                badgeColor="bg-red-500"
              />
              <SidebarLink
                to={`/w/${workspace.slug}/brain`}
                icon={Brain}
                label="Brand Brain"
              />
              <SidebarLink
                to={`/w/${workspace.slug}/analytics`}
                icon={BarChart3}
                label="Analytics"
              />
              <div className="mt-2 border-t border-border pt-2" />
              <SidebarLink
                to={`/w/${workspace.slug}/settings/general`}
                icon={Settings}
                label="Settings"
              />
            </SidebarSection>
          )}
        </nav>

        <div className="border-t border-border p-3 text-xs text-ink-muted">
          <div className="flex items-center justify-between">
            <span>v0.1.0 · mock</span>
            <span>Pulse</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {accent && (
          <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
        )}
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  badge,
  badgeColor,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  badgeColor?: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-hover text-ink"
            : "text-ink-muted hover:bg-hover hover:text-ink",
        )
      }
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
            badgeColor ?? "bg-red-500",
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}
