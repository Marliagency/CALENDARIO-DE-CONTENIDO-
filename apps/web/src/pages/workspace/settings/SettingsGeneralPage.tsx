import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { sync, mockMode } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { dataCache } from "@/lib/api/data-cache";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  "Europe/Madrid",
  "Europe/London",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "America/Bogota",
  "America/Buenos_Aires",
  "Asia/Tokyo",
];
const LANGUAGES = [
  { value: "es-ES", label: "Espanol (ES)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-MX", label: "Espanol (MX)" },
];

export function SettingsGeneralPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");

  const [name, setName] = useState(ws?.name ?? "");
  const [description, setDescription] = useState(ws?.description ?? "");
  const [colorPrimary, setColorPrimary] = useState(ws?.brandColorPrimary ?? "#3B82F6");
  const [colorSecondary, setColorSecondary] = useState(ws?.brandColorSecondary ?? "#7c5cfc");
  const [timezone, setTimezone] = useState(ws?.defaultTimezone ?? "Europe/Madrid");
  const [language, setLanguage] = useState(ws?.defaultLanguage ?? "es-ES");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ws) return null;

  const isDirty =
    name !== ws.name ||
    description !== (ws.description ?? "") ||
    colorPrimary !== ws.brandColorPrimary ||
    colorSecondary !== (ws.brandColorSecondary ?? "#7c5cfc") ||
    timezone !== ws.defaultTimezone ||
    language !== ws.defaultLanguage;

  async function save() {
    if (!slug) return;
    if (mockMode) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await http.updateWorkspace(slug, {
        name: name.trim(),
        description: description.trim() || null,
        brandColorPrimary: colorPrimary,
        brandColorSecondary: colorSecondary,
        defaultTimezone: timezone,
        defaultLanguage: language,
      });
      // Refrescar workspace en cache
      const fresh = (await http.getWorkspace(slug)) as NonNullable<typeof ws>;
      const idx = dataCache.workspaces.findIndex((w) => w.slug === slug);
      if (idx !== -1) {
        dataCache.workspaces[idx] = fresh;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function dangerAction(action: "pause" | "archive" | "delete") {
    if (mockMode) {
      alert("Requiere modo HTTP (pnpm dev con VITE_MOCK_API=0).");
      return;
    }
    if (!ws) return;
    const labels = { pause: "pausar", archive: "archivar", delete: "ELIMINAR" };
    if (!confirm(`Seguro que quieres ${labels[action]} el workspace "${ws.name}"?`)) return;
    if (action === "delete") {
      const confirm2 = prompt(`Escribe el nombre del workspace para confirmar: "${ws.name}"`);
      if (confirm2 !== ws.name) {
        alert("El nombre no coincide. Operacion cancelada.");
        return;
      }
    }
    setSaving(true);
    try {
      if (action === "delete") {
        await http.updateWorkspace(slug!, { status: "deleted" });
        window.location.href = "/overview";
      } else {
        await http.updateWorkspace(slug!, {
          status: action === "pause" ? "paused" : "archived",
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-5">
        <Field label="Nombre">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Slug">
          <input className="input" value={ws.slug} disabled />
        </Field>
        <Field label="Descripcion">
          <textarea
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Color primario">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
              />
              <input
                className="input flex-1 font-mono text-xs"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Color secundario">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorSecondary}
                onChange={(e) => setColorSecondary(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
              />
              <input
                className="input flex-1 font-mono text-xs"
                value={colorSecondary}
                onChange={(e) => setColorSecondary(e.target.value)}
              />
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zona horaria">
            <select
              className="input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </select>
          </Field>
          <Field label="Idioma por defecto">
            <select
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && (
          <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-emerald-400">Guardado</span>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={save}
            disabled={saving || (!isDirty && !mockMode)}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar cambios
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-1 text-sm font-semibold">Zona de peligro</h3>
        <p className="mb-4 text-xs text-ink-muted">
          Estas acciones afectan al workspace entero y no se pueden deshacer facilmente.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => dangerAction("pause")}
            disabled={saving}
          >
            Pausar workspace
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => dangerAction("archive")}
            disabled={saving}
          >
            Archivar
          </button>
          <button
            type="button"
            className={cn("btn-secondary border border-red-500/30 text-red-400 hover:bg-red-500/10")}
            onClick={() => dangerAction("delete")}
            disabled={saving}
          >
            Eliminar workspace
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
