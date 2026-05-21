import { Bell, Check, Mail, MessageSquare, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { mockMode } from "@/lib/api/client";
import { http } from "@/lib/api/http";
import { useAuth } from "@/lib/auth";

const INITIAL_CHANNELS = [
  { kind: "email", label: "Email", icon: Mail, target: "diego@qyro.app", active: true },
  { kind: "slack", label: "Slack", icon: MessageSquare, target: "#pulse-alerts", active: false },
  { kind: "push", label: "Push", icon: Bell, target: "Navegador", active: true },
  { kind: "webhook", label: "Webhook", icon: Webhook, target: "—", active: false },
];

const ALL_EVENTS = [
  "Pieza llega a revision",
  "Publicacion falla",
  "Token expira en <7 dias",
  "Cuota API >85%",
  "Boost completado",
  "Pieza alcanza top engagement",
];

const STORAGE_KEY = "pulse.notification-prefs";

type StoredPrefs = {
  channels: Record<string, boolean>;
  events: Record<string, boolean>;
};

function loadLocalPrefs(): StoredPrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPrefs;
  } catch {
    return null;
  }
}

export function SettingsNotificationsPage() {
  const { user, setUser } = useAuth();

  // Source of truth: en HTTP mode = user.notificationPrefs; en mock = localStorage
  const initial =
    !mockMode && user?.notificationPrefs
      ? (user.notificationPrefs as Partial<StoredPrefs>)
      : (loadLocalPrefs() ?? {});

  const [channels, setChannels] = useState(
    INITIAL_CHANNELS.map((c) => ({
      ...c,
      active: initial?.channels?.[c.kind] ?? c.active,
    })),
  );
  const [events, setEvents] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_EVENTS.map((e) => [e, initial?.events?.[e] ?? true])),
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide the "Guardado" badge after 2.5s
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  function toggleChannel(kind: string) {
    setChannels((prev) =>
      prev.map((c) => (c.kind === kind ? { ...c, active: !c.active } : c)),
    );
  }

  function toggleEvent(name: string) {
    setEvents((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const prefs: StoredPrefs = {
      channels: Object.fromEntries(channels.map((c) => [c.kind, c.active])),
      events,
    };
    try {
      if (mockMode) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        await new Promise((r) => setTimeout(r, 200));
      } else {
        const updated = await http.updateProfile({ notificationPrefs: prefs as unknown as Record<string, unknown> });
        if (user) {
          setUser({ ...user, notificationPrefs: updated.notificationPrefs ?? prefs });
        }
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Canales de notificacion</h3>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
              <Check className="size-3" />
              Guardado
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="card divide-y divide-border">
        {channels.map((c) => (
          <div key={c.kind} className="flex items-center gap-3 p-4">
            <c.icon className="size-4 text-ink-muted" />
            <div className="flex-1">
              <div className="text-sm font-medium">{c.label}</div>
              <div className="text-xs text-ink-muted">{c.target}</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={c.active}
                onChange={() => toggleChannel(c.kind)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-hover peer-checked:bg-ws transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold">Eventos a notificar</h3>
      <div className="card p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_EVENTS.map((e) => (
            <label key={e} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={events[e] ?? true}
                onChange={() => toggleEvent(e)}
              />
              {e}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
