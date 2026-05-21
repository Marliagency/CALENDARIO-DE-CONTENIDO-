import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { mockMode } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { PageHeader } from "@/components/ui/PageHeader";
import { getInitials } from "@/lib/utils";

export function ProfilePage() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync fields when user loads (HTTP mode — user may be null initially)
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  if (!user) {
    return (
      <div>
        <PageHeader title="Mi cuenta" description="Informacion del usuario." />
        <div className="flex items-center justify-center py-16 text-sm text-ink-muted">
          Cargando...
        </div>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (mockMode) {
      // No backend call in mock mode — just show success feedback.
      await new Promise((r) => setTimeout(r, 300));
      setSaving(false);
      setSaved(true);
      return;
    }

    try {
      // TODO: PATCH /api/v1/auth/me may not exist yet — add to backend when ready.
      await http.updateProfile({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Mi cuenta" description="Informacion del usuario." />
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <div className="card flex items-center gap-4 p-5">
          <span className="grid size-14 place-items-center rounded-full bg-ws text-lg font-semibold text-white">
            {getInitials(user.name ?? user.email)}
          </span>
          <div>
            <div className="font-semibold">{user.name ?? "—"}</div>
            <div className="text-sm text-ink-muted">{user.email}</div>
          </div>
        </div>

        <form onSubmit={handleSave} className="card space-y-3 p-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <Field label="Nombre">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-1">
            {saved && (
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                <Check className="size-3" />
                Guardado
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
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
