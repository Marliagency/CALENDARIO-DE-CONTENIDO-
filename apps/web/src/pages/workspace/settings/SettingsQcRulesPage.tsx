import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Platform } from "@pulse/types";
import { mockMode } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { cn } from "@/lib/utils";

// Local rule type — extends the API type with an optional description field
// (the QcRule type in @pulse/types does not include description yet)
interface LocalRule {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  appliesToPlatforms: Platform[];
  ruleType: string;
  severity: "warning" | "error";
  active: boolean;
}

const ALL_PLATFORMS: Platform[] = [
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "linkedin",
  "twitter_x",
];

const RULE_TYPES = [
  "caption_length",
  "hashtag_count",
  "video_duration",
  "aspect_ratio",
  "forbidden_claims",
  "custom",
];

const DEFAULT_MOCK_RULES: LocalRule[] = [
  {
    id: "mock-rule-0",
    workspaceId: "mock",
    name: "Caption length",
    description: "Verificar que el caption no supera el limite de la plataforma.",
    appliesToPlatforms: ["instagram", "tiktok", "facebook"],
    severity: "warning",
    active: true,
    ruleType: "caption_length",
  },
  {
    id: "mock-rule-1",
    workspaceId: "mock",
    name: "Hashtag count",
    description: "Avisar si hay mas de 30 hashtags (limite IG).",
    appliesToPlatforms: ["instagram"],
    severity: "warning",
    active: true,
    ruleType: "hashtag_count",
  },
  {
    id: "mock-rule-2",
    workspaceId: "mock",
    name: "Video duration",
    description: "Validar que la duracion encaja en el formato (Reel <90s, Short <60s).",
    appliesToPlatforms: ["instagram", "tiktok", "youtube"],
    severity: "error",
    active: true,
    ruleType: "video_duration",
  },
  {
    id: "mock-rule-3",
    workspaceId: "mock",
    name: "Aspect ratio",
    description: "Comprobar ratio segun formato (Reel 9:16, Feed 1:1 o 4:5).",
    appliesToPlatforms: ["instagram", "tiktok"],
    severity: "error",
    active: true,
    ruleType: "aspect_ratio",
  },
  {
    id: "mock-rule-4",
    workspaceId: "mock",
    name: "Claims prohibidos",
    description: "Detectar claims del Brand Brain marcados como prohibidos en el caption.",
    appliesToPlatforms: ["instagram", "tiktok", "facebook", "youtube"],
    severity: "error",
    active: true,
    ruleType: "forbidden_claims",
  },
];

interface NewRuleForm {
  name: string;
  description: string;
  severity: "warning" | "error";
  ruleType: string;
  platforms: Platform[];
}

const EMPTY_FORM: NewRuleForm = {
  name: "",
  description: "",
  severity: "warning",
  ruleType: "caption_length",
  platforms: [],
};

export function SettingsQcRulesPage() {
  const { slug } = useParams<{ slug: string }>();
  const [rules, setRules] = useState<LocalRule[]>(mockMode ? DEFAULT_MOCK_RULES : []);
  const [loading, setLoading] = useState(!mockMode);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewRuleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mockMsg, setMockMsg] = useState<string | null>(null);

  useEffect(() => {
    if (mockMode || !slug) return;
    setLoading(true);
    http
      .getQcRules(slug)
      .then((data) =>
        setRules(
          data.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            name: r.name,
            description: undefined,
            appliesToPlatforms: r.appliesToPlatforms,
            ruleType: r.ruleType,
            severity: r.severity,
            active: r.active,
          })),
        ),
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar reglas"))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleToggle(rule: LocalRule) {
    const updated = { ...rule, active: !rule.active };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    if (mockMode) return;
    if (!slug) return;
    try {
      await http.updateQcRule(slug, rule.id, { active: !rule.active });
    } catch {
      // Revert on failure
      setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (mockMode) {
      const mock: LocalRule = {
        id: `mock-rule-${Date.now()}`,
        workspaceId: "mock",
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        appliesToPlatforms: form.platforms,
        ruleType: form.ruleType,
        severity: form.severity,
        active: true,
      };
      setRules((prev) => [...prev, mock]);
      setShowModal(false);
      setForm(EMPTY_FORM);
      setMockMsg("Regla anadida localmente (modo mock). Conecta la API para persistir.");
      return;
    }

    if (!slug) return;
    setSaving(true);
    setError(null);
    try {
      const created = await http.createQcRule(slug, {
        name: form.name.trim(),
        severity: form.severity,
        ruleType: form.ruleType,
        appliesToPlatforms: form.platforms,
        appliesToFormats: [],
        params: {},
        active: true,
      });
      const local: LocalRule = {
        id: created.id,
        workspaceId: created.workspaceId,
        name: created.name,
        description: form.description.trim() || undefined,
        appliesToPlatforms: created.appliesToPlatforms,
        ruleType: created.ruleType,
        severity: created.severity,
        active: created.active,
      };
      setRules((prev) => [...prev, local]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la regla");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (mockMode) {
      setRules((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
      return;
    }
    if (!slug) return;
    try {
      await http.deleteQcRule(slug, id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la regla");
    } finally {
      setDeleteConfirm(null);
    }
  }

  function togglePlatform(p: Platform) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-ink-muted">
        Cargando reglas...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Reglas de calidad (QC)</h3>
        <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="size-4" /> Nueva regla
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

      <div className="card divide-y divide-border">
        {rules.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            No hay reglas configuradas.
          </div>
        )}
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{r.name}</div>
              {r.description && (
                <div className="text-xs text-ink-muted">{r.description}</div>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                {r.appliesToPlatforms.map((p) => (
                  <span key={p} className="pill bg-hover text-ink-muted">
                    {p}
                  </span>
                ))}
                <span
                  className={
                    r.severity === "error"
                      ? "pill bg-red-500/15 text-red-400"
                      : "pill bg-amber-500/15 text-amber-400"
                  }
                >
                  {r.severity}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {deleteConfirm === r.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-ink-muted">Confirmar?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="rounded px-2 py-0.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="rounded px-2 py-0.5 text-xs text-ink-muted hover:bg-hover"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(r.id)}
                  className="rounded p-1 text-ink-muted hover:bg-red-500/10 hover:text-red-400"
                  title="Eliminar regla"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={r.active}
                  onChange={() => handleToggle(r)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-hover peer-checked:bg-ws transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          </div>
        ))}
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
              <h2 className="text-base font-semibold">Nueva regla QC</h2>
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
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">Descripcion</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">Tipo de regla</label>
                <select
                  className="input"
                  value={form.ruleType}
                  onChange={(e) => setForm((p) => ({ ...p, ruleType: e.target.value }))}
                >
                  {RULE_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="label">Severidad</label>
                <div className="flex gap-2">
                  {(["warning", "error"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, severity: s }))}
                      className={cn(
                        "flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors",
                        form.severity === s
                          ? s === "error"
                            ? "border-red-500 bg-red-500/15 text-red-400"
                            : "border-amber-500 bg-amber-500/15 text-amber-400"
                          : "border-border bg-surface text-ink-muted hover:text-ink",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Plataformas</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        form.platforms.includes(p)
                          ? "border-ws bg-ws/15 text-ws"
                          : "border-border bg-surface text-ink-muted hover:text-ink",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
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
                  {saving ? "Guardando..." : "Crear regla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
