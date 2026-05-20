import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";

export function SettingsGeneralPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = sync.workspace(slug ?? "");
  if (!ws) return null;

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-5">
        <Field label="Nombre">
          <input className="input" defaultValue={ws.name} />
        </Field>
        <Field label="Slug">
          <input className="input" defaultValue={ws.slug} disabled />
        </Field>
        <Field label="Descripción">
          <textarea className="input" defaultValue={ws.description} rows={3} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Color primario">
            <input type="color" defaultValue={ws.brandColorPrimary} className="h-9 w-full rounded-md" />
          </Field>
          <Field label="Color secundario">
            <input
              type="color"
              defaultValue={ws.brandColorSecondary ?? "#7c5cfc"}
              className="h-9 w-full rounded-md"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zona horaria">
            <select className="input" defaultValue={ws.defaultTimezone}>
              <option>Europe/Madrid</option>
              <option>Europe/London</option>
              <option>America/Mexico_City</option>
              <option>America/New_York</option>
            </select>
          </Field>
          <Field label="Idioma por defecto">
            <select className="input" defaultValue={ws.defaultLanguage}>
              <option value="es-ES">es-ES</option>
              <option value="en-US">en-US</option>
              <option value="es-MX">es-MX</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-2 text-sm font-semibold">Zona de peligro</h3>
        <p className="mb-3 text-xs text-ink-muted">
          Estas acciones afectan al workspace entero.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary">
            Pausar workspace
          </button>
          <button type="button" className="btn-secondary">
            Archivar
          </button>
          <button type="button" className="btn-secondary">
            Duplicar
          </button>
          <button type="button" className="btn-danger">
            Eliminar
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
