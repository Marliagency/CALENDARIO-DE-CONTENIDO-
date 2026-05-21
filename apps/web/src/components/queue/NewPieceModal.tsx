import { X } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import type { ContentFormat } from "@pulse/types";
import { mockMode, sync } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { dataCache } from "@/lib/api/data-cache";
import { cn } from "@/lib/utils";

const FORMATS: { id: ContentFormat; label: string }[] = [
  { id: "image", label: "Imagen" },
  { id: "carousel", label: "Carrusel" },
  { id: "reel", label: "Reel" },
  { id: "ugc_video", label: "UGC Video" },
  { id: "app_demo", label: "App Demo" },
  { id: "lifestyle_ad", label: "Lifestyle Ad" },
  { id: "short", label: "Short" },
  { id: "post", label: "Post" },
];

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export function NewPieceModal({ onClose, onCreated }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const ws = slug ? sync.workspace(slug) : undefined;

  const campaigns = ws ? sync.campaigns(ws.id) : [];

  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ContentFormat>("image");
  const [status, setStatus] = useState<"draft" | "in_review">("draft");
  const [notes, setNotes] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockMsg, setMockMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (mockMode) {
      setMockMsg("Requiere API en modo HTTP. Cambia VITE_MOCK_API=0 para crear piezas reales.");
      return;
    }

    if (!slug) return;

    setSaving(true);
    setError(null);
    try {
      const piece = await http.createPiece(slug, {
        title: title.trim(),
        format,
        status,
        notes: notes.trim() || undefined,
        campaignId: campaignId || undefined,
      });
      dataCache.addPiece(piece);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la pieza");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-base shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Nueva pieza de contenido</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted hover:bg-hover hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {mockMsg && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              {mockMsg}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="label">
              Titulo <span className="text-red-400">*</span>
            </label>
            <input
              className="input"
              placeholder="Nombre de la pieza"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">Formato</label>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    format === f.id
                      ? "border-ws bg-ws/15 text-ws"
                      : "border-border bg-surface text-ink-muted hover:text-ink",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Estado inicial</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("draft")}
                className={cn(
                  "flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors",
                  status === "draft"
                    ? "border-ws bg-ws/15 text-ws"
                    : "border-border bg-surface text-ink-muted hover:text-ink",
                )}
              >
                Borrador
              </button>
              <button
                type="button"
                onClick={() => setStatus("in_review")}
                className={cn(
                  "flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors",
                  status === "in_review"
                    ? "border-ws bg-ws/15 text-ws"
                    : "border-border bg-surface text-ink-muted hover:text-ink",
                )}
              >
                Enviar a revision
              </button>
            </div>
          </div>

          {campaigns.length > 0 && (
            <div className="space-y-1.5">
              <label className="label">Campana (opcional)</label>
              <select
                className="input"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">Sin campana</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="label">Notas (opcional)</label>
            <textarea
              className="input min-h-[72px] resize-none"
              placeholder="Contexto, referencias, instrucciones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear pieza"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
