import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { useWorkspaceTheme } from "@/lib/workspace-theme";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export function AppShell() {
  const { slug } = useParams<{ slug: string }>();
  const workspace = slug ? sync.workspace(slug) : undefined;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useWorkspaceTheme(workspace);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSwitcherOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          workspace={workspace}
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <WorkspaceSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}
