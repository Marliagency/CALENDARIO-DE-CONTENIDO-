import { Check, Plus, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { workspacesWithCounts } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface WorkspaceSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export function WorkspaceSwitcher({ open, onClose }: WorkspaceSwitcherProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const workspaces = workspacesWithCounts();

  useEffect(() => {
    if (!open) setQuery("");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-20 w-[min(560px,calc(100%-2rem))] -translate-x-1/2">
        <div className="card overflow-hidden">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar workspace o navegar..."
            className="w-full border-0 border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-ink-muted"
          />
          <div className="max-h-80 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/overview");
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-hover"
            >
              <span className="size-2.5 rounded-full bg-slate-500" />
              <span className="flex-1 text-left">Resumen global</span>
              <span className="text-xs text-ink-muted">Todos los workspaces</span>
            </button>
            <div className="my-1 border-t border-border" />
            {filtered.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/w/${w.slug}/dashboard`);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-hover",
                  slug === w.slug && "bg-hover",
                )}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: w.brandColorPrimary }}
                />
                <span className="flex-1 text-left font-medium">{w.name}</span>
                {w.pendingCount > 0 && (
                  <span className="pill bg-red-500/15 text-red-400">
                    {w.pendingCount} pendientes
                  </span>
                )}
                {slug === w.slug && <Check className="size-4 text-emerald-400" />}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border bg-base px-3 py-2 text-xs">
            <Link
              to="/workspaces"
              onClick={onClose}
              className="flex items-center gap-1.5 text-ink-muted hover:text-ink"
            >
              <SettingsIcon className="size-3.5" /> Gestionar workspaces
            </Link>
            <Link
              to="/workspaces/new"
              onClick={onClose}
              className="flex items-center gap-1.5 text-ink-muted hover:text-ink"
            >
              <Plus className="size-3.5" /> Nuevo workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
