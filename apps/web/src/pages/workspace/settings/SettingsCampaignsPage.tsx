import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import type { Campaign } from "@pulse/types";
import { mockMode, sync } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { dataCache } from "@/lib/api/data-cache";
import { formatDate, formatNumber } from "@/lib/utils";

interface NewCampaignForm {
  name: string;
  objective: string;
  startAt: string;
  endAt: string;
  kpiName: string;
  kpiTarget: string;
  notes: string;
}

const EMPTY_FORM: NewCampaignForm = {
  name: "",
  objective: "",
  startAt: "",
  endAt: "",
  kpiName: "",
  kpiTarget: "",
  notes: "",
};

export function SettingsCampaignsPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  const remoteCampaigns = ws ? sync.campaigns(ws.id) : [];

  // Local state to allow optimistic updates
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[] | null>(null);
  const campaigns = localCampaigns ?? remoteCampaigns;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewCampaignForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mockMsg, setMockMsg] = useState<string | null>(null);

  if (!ws) return null;

  function updateForm(field: keyof NewCampaignForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (mockMode) {
      setMockMsg("Requiere API en modo HTTP para crear campanas. Cambia VITE_MOCK_API=0.");
      setShowModal(false);
      setForm(EMPTY_FORM);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await http.createCampaign(slug!, {
        name: form.name.trim(),
        objective: form.objective.trim() || undefined,
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
        kpiName: form.kpiName.trim() || undefined,
        kpiTarget: form.kpiTarget ? parseFloat(form.kpiTarget) : undefined,
        notes: form.notes.trim() || undefined,
      });
      // Refetch campaigns and update local + cache
      const fresh = (await http.getCampaigns(slug!)) as Campaign[];
      dataCache.setCampaigns(ws!.id, fresh);
      setLocalCampaigns(fresh.filter((c) => c.workspaceId === ws!.id));
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la campana");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (mockMode) {
      setLocalCampaigns(campaigns.filter((c) => c.id !== id));
      dataCache.removeCampaign(id);
      setDeleteConfirm(null);
      setMockMsg("Eliminado localmente (modo mock). Conecta la API para persistir.");
      return;
    }
    try {
      await http.deleteCampaign(slug!, id);
      const fresh = (await http.getCampaigns(slug!)) as Campaign[];
      dataCache.setCampaigns(ws!.id, fresh);
      setLocalCampaigns(fresh.filter((c) => c.workspaceId === ws!.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la campana");
    } finally {
      setDeleteConfirm(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Campanas</h3>
        <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="size-4" /> Nueva campana
        </button>
      </div>

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

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-muted">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Objetivo</th>
              <th className="px-3 py-2 font-medium">KPI</th>
              <th className="px-3 py-2 font-medium">Periodo</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-ink-muted">
                  No hay campanas. Crea una para empezar.
                </td>
              </tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium">{c.name}</td>
                <td className="px-3 py-2.5">{c.objective ?? "—"}</td>
                <td className="px-3 py-2.5">
                  {c.kpiName ? `${c.kpiName} · ${formatNumber(c.kpiTarget)}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-ink-muted">
                  {c.startAt || c.endAt
                    ? `${formatDate(c.startAt)} → ${formatDate(c.endAt)}`
                    : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <span className="pill bg-emerald-500/15 text-emerald-400">{c.status}</span>
                </td>
                <td className="px-3 py-2.5">
                  {deleteConfirm === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="rounded px-2 py-0.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded px-2 py-0.5 text-xs text-ink-muted hover:bg-hover"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(c.id)}
                      className="rounded p-1 text-ink-muted hover:bg-red-500/10 hover:text-red-400"
                      title="Eliminar campana"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-base shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Nueva campana</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-ink-muted hover:bg-hover hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 p-5">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="label">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">Objetivo</label>
                <input
                  className="input"
                  placeholder="Ej: Awareness, Leads, Ventas..."
                  value={form.objective}
                  onChange={(e) => updateForm("objective", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="label">Inicio</label>
                  <input
                    type="date"
                    className="input"
                    value={form.startAt}
                    onChange={(e) => updateForm("startAt", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Fin</label>
                  <input
                    type="date"
                    className="input"
                    value={form.endAt}
                    onChange={(e) => updateForm("endAt", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="label">KPI</label>
                  <input
                    className="input"
                    placeholder="Ej: Seguidores, Leads..."
                    value={form.kpiName}
                    onChange={(e) => updateForm("kpiName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Meta KPI</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="1000"
                    min={0}
                    value={form.kpiTarget}
                    onChange={(e) => updateForm("kpiTarget", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Notas</label>
                <textarea
                  className="input min-h-[60px] resize-none"
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Crear campana"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
