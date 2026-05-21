import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import type { BuyerPersona } from "@pulse/types";
import { sync, mockMode } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { dataCache } from "@/lib/api/data-cache";

const PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "linkedin", "twitter_x"];

export function SettingsPersonasPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  if (!ws) return null;
  const personas = sync.personas(ws.id);

  async function deletePersona(p: BuyerPersona) {
    if (!confirm(`Eliminar la persona "${p.name}"?`)) return;
    if (mockMode) { setError("Requiere modo HTTP."); return; }
    setBusy(p.id);
    try {
      await http.deletePersona(slug!, p.id);
      dataCache.upsertPersona({ ...p, id: "__deleted__" });
      // Quick hack: refetch personas
      const fresh = await http.getPersonas(slug!) as BuyerPersona[];
      for (const fp of fresh) dataCache.upsertPersona(fp);
      forceRender((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Buyer personas</h3>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Nueva persona
        </button>
      </div>
      {personas.length === 0 ? (
        <p className="card px-4 py-6 text-sm text-ink-muted">
          Aun no hay personas definidas para este workspace.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {personas.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-ink-muted">{p.ageRange}</div>
                </div>
                <div className="flex items-center gap-1">
                  {p.isProTarget && (
                    <span className="pill bg-violet-500/15 text-violet-400">Pro</span>
                  )}
                  <button
                    type="button"
                    className="btn-ghost text-xs text-red-400 hover:bg-red-500/10"
                    onClick={() => deletePersona(p)}
                    disabled={busy === p.id}
                  >
                    {busy === p.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-muted line-clamp-2">{p.demographics}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.preferredPlatforms.map((pl) => (
                  <span key={pl} className="pill bg-hover">{pl}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <NewPersonaModal
          workspaceSlug={slug!}
          workspaceId={ws.id}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); forceRender((n) => n + 1); }}
        />
      )}
    </div>
  );
}

function NewPersonaModal({ workspaceSlug, workspaceId, onClose, onCreated }: {
  workspaceSlug: string;
  workspaceId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("25-34");
  const [demographics, setDemographics] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [goals, setGoals] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [isProTarget, setIsProTarget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(p: string) {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  async function submit() {
    if (mockMode) { setError("Requiere modo HTTP (pnpm dev + VITE_MOCK_API=0)."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const created = await http.createPersona(workspaceSlug, {
        name,
        ageRange,
        demographics,
        painPoints: painPoints.split("\n").filter(Boolean),
        goals: goals.split("\n").filter(Boolean),
        preferredPlatforms: platforms,
        isProTarget,
        workspaceId,
      }) as BuyerPersona;
      dataCache.upsertPersona(created);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Nueva buyer persona</h3>
          <button type="button" className="btn-ghost" onClick={onClose}><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="label">Nombre *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Emprendedor digital" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="label">Rango de edad</label>
            <input className="input" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="25-34" />
          </div>
          <div className="space-y-1">
            <label className="label">Descripcion demografica</label>
            <textarea className="input" value={demographics} onChange={(e) => setDemographics(e.target.value)} rows={2} placeholder="Empresario, vive en ciudad..." />
          </div>
          <div className="space-y-1">
            <label className="label">Pain points (uno por linea)</label>
            <textarea className="input" value={painPoints} onChange={(e) => setPainPoints(e.target.value)} rows={3} placeholder="No tiene tiempo&#10;Necesita orden" />
          </div>
          <div className="space-y-1">
            <label className="label">Objetivos (uno por linea)</label>
            <textarea className="input" value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} placeholder="Mejorar productividad&#10;Reducir estres" />
          </div>
          <div className="space-y-1">
            <label className="label">Plataformas preferidas</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={`rounded-full px-3 py-1 text-xs ${platforms.includes(p) ? "bg-ws text-white" : "bg-hover text-ink-muted"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isProTarget} onChange={(e) => setIsProTarget(e.target.checked)} />
            Segmento Pro (usuario de pago objetivo)
          </label>
        </div>
        {error && <div className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={!name.trim() || submitting} onClick={submit}>
            {submitting && <Loader2 className="size-4 animate-spin" />} Crear persona
          </button>
        </div>
      </div>
    </div>
  );
}
