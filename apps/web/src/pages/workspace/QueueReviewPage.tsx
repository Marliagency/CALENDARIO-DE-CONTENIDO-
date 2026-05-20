import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { QueueReviewPanel } from "@/components/queue/QueueReviewPanel";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function QueueReviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [search] = useSearchParams();
  const pieceId = search.get("piece");

  const ws = slug ? sync.workspace(slug) : undefined;
  if (!ws) return <NotFoundPage />;

  const pieces = sync.pieces(ws.id);
  const piece = pieces.find((p) => p.id === pieceId) ?? pieces[0];

  if (!piece) {
    return (
      <div className="p-6 text-sm text-ink-muted">
        No hay piezas para revisar en este workspace.
      </div>
    );
  }

  const idx = pieces.findIndex((p) => p.id === piece.id);
  const prev = pieces[idx - 1];
  const next = pieces[idx + 1];

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-base/30 px-6 py-3">
        <Link to={`/w/${ws.slug}/queue`} className="btn-ghost">
          <ArrowLeft className="size-4" /> Volver a la cola
        </Link>
        <div className="flex items-center gap-2">
          {prev && (
            <Link
              to={`/w/${ws.slug}/queue/review?piece=${prev.id}`}
              className="btn-secondary"
            >
              <ChevronLeft className="size-4" /> Anterior
            </Link>
          )}
          {next && (
            <Link
              to={`/w/${ws.slug}/queue/review?piece=${next.id}`}
              className="btn-secondary"
            >
              Siguiente <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
      <QueueReviewPanel piece={piece} workspaceSlug={ws.slug} />
    </div>
  );
}
