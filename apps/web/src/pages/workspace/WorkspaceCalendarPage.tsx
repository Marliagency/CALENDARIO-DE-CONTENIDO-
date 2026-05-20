import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function WorkspaceCalendarPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = slug ? sync.workspace(slug) : undefined;
  if (!ws) return <NotFoundPage />;

  const variants = sync.variantsForWorkspace(ws.id);
  const pieces = sync.pieces(ws.id);
  const accounts = sync.accounts(ws.id);

  return (
    <div>
      <PageHeader
        title="Calendario"
        description="Vista del workspace. Arrastra (próximamente) para reprogramar, click en una pieza para abrirla."
        actions={
          <button type="button" className="btn-primary">
            <Plus className="size-4" /> Nueva pieza
          </button>
        }
      />
      <div className="p-6">
        <MonthGrid
          variants={variants}
          pieces={pieces}
          workspaces={[ws]}
          accounts={accounts}
          workspaceSlug={ws.slug}
        />
      </div>
    </div>
  );
}
