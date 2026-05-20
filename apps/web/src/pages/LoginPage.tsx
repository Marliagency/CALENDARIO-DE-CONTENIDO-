import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { mockMode } from "@/lib/api/client";

export function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(mockMode ? "diego@qyro.app" : "");
  const [password, setPassword] = useState(mockMode ? "pulse-demo-2026" : "");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-ink-muted" />
      </div>
    );
  }
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/overview";
    return <Navigate to={from} replace />;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name || undefined);
      navigate("/overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-base p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-5 flex items-center gap-2">
          <div
            className="grid size-9 place-items-center rounded-md text-white text-lg font-bold"
            style={{ backgroundColor: "var(--ws-primary)" }}
          >
            P
          </div>
          <div>
            <div className="font-semibold tracking-tight">Pulse</div>
            <div className="text-xs text-ink-muted">
              {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
            </div>
          </div>
        </div>

        {mockMode && (
          <div className="mb-3 rounded-md bg-hover px-3 py-2 text-xs text-ink-muted">
            Modo mock activo · credenciales prellenadas. Para auth real,
            arranca <code>pnpm dev:api</code> y pon <code>VITE_MOCK_API=0</code>.
          </div>
        )}

        <div className="space-y-3">
          {mode === "register" && (
            <Field label="Nombre">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Diego"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoFocus={mode === "login"}
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Mínimo 8 caracteres" : "********"}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </Field>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="button"
          className="btn-primary mt-4 w-full justify-center"
          onClick={submit}
          disabled={submitting || !email || !password}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>

        <button
          type="button"
          className="mt-3 w-full text-center text-xs text-ink-muted hover:text-ink"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login"
            ? "¿No tienes cuenta? Crear una"
            : "Ya tengo cuenta — iniciar sesión"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
