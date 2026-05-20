import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { http } from "@/lib/api/http";
import { mockMode } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";

export function NewWorkspacePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "brand" as "brand" | "personal" | "client" | "other",
    description: "",
    brandColorPrimary: "#3B82F6",
    brandColorSecondary: "#7C5CFC",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function submit() {
    if (!form.name.trim()) {
      setError("Falta el nombre");
      return;
    }
    const slug = form.slug.trim() || autoSlug(form.name);
    setSubmitting(true);
    setError(null);
    try {
      if (mockMode) {
        // En mock no podemos crear. Solo navegamos a la lista.
        await new Promise((r) => setTimeout(r, 300));
        alert(
          `Modo mock: en producción se crearía "${form.name}" con slug "${slug}".`,
        );
        navigate("/workspaces");
        return;
      }
      await http.createWorkspace({ ...form, slug });
      navigate(`/w/${slug}/dashboard`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nuevo workspace"
        description={
          mockMode
            ? "Modo mock — el formulario validará pero no persistirá."
            : "Crea un nuevo espacio para una marca, persona o cliente."
        }
        actions={
          <Link to="/workspaces" className="btn-secondary">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="card space-y-4 p-5">
          <Field label="Nombre">
            <input
              className="input"
              placeholder="Ej: QYRO, Mi marca..."
              value={form.name}
              onChange={(e) => {
                update("name", e.target.value);
                if (!form.slug) update("slug", autoSlug(e.target.value));
              }}
            />
          </Field>
          <Field label="Slug (URL)">
            <input
              className="input font-mono text-sm"
              placeholder="qyro"
              value={form.slug}
              onChange={(e) =>
                update(
                  "slug",
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                )
              }
            />
          </Field>
          <Field label="Tipo">
            <select
              className="input"
              value={form.type}
              onChange={(e) => update("type", e.target.value as typeof form.type)}
            >
              <option value="brand">Marca</option>
              <option value="personal">Personal</option>
              <option value="client">Cliente</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <Field label="Descripción (opcional)">
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color primario">
              <input
                type="color"
                className="h-9 w-full rounded-md"
                value={form.brandColorPrimary}
                onChange={(e) => update("brandColorPrimary", e.target.value)}
              />
            </Field>
            <Field label="Color secundario">
              <input
                type="color"
                className="h-9 w-full rounded-md"
                value={form.brandColorSecondary}
                onChange={(e) => update("brandColorSecondary", e.target.value)}
              />
            </Field>
          </div>
        </div>
        {error && (
          <div className="rounded-md bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Link to="/workspaces" className="btn-secondary">
            Cancelar
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={submitting || !form.name.trim()}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Crear workspace
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
