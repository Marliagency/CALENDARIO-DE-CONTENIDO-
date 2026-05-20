import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";

export function NewWorkspacePage() {
  return (
    <div>
      <PageHeader
        title="Nuevo workspace"
        description="Crea un nuevo espacio para una marca, persona o cliente. (Modo mock — el formulario no persiste todavía.)"
        actions={
          <Link to="/workspaces" className="btn-secondary">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="card space-y-4 p-5">
          <Field label="Nombre">
            <input className="input" placeholder="Ej: QYRO, Mi marca..." />
          </Field>
          <Field label="Slug (URL)">
            <input className="input" placeholder="qyro" />
          </Field>
          <Field label="Tipo">
            <select className="input">
              <option value="brand">Marca</option>
              <option value="personal">Personal</option>
              <option value="client">Cliente</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <Field label="Descripción (opcional)">
            <textarea className="input" rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color primario">
              <input type="color" defaultValue="#3B82F6" className="h-9 w-full rounded-md" />
            </Field>
            <Field label="Color secundario">
              <input type="color" defaultValue="#7C5CFC" className="h-9 w-full rounded-md" />
            </Field>
          </div>
          <Field label="Zona horaria">
            <select className="input">
              <option>Europe/Madrid</option>
              <option>Europe/London</option>
              <option>America/Mexico_City</option>
              <option>America/New_York</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Link to="/workspaces" className="btn-secondary">
            Cancelar
          </Link>
          <button type="button" className="btn-primary" disabled>
            Crear workspace (mock)
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
