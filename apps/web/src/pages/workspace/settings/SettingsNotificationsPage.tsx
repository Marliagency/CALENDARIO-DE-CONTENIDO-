import { Bell, Mail, MessageSquare, Webhook } from "lucide-react";

const CHANNELS = [
  { kind: "email", label: "Email", icon: Mail, target: "diego@qyro.app", active: true },
  { kind: "slack", label: "Slack", icon: MessageSquare, target: "#pulse-alerts", active: false },
  { kind: "push", label: "Push", icon: Bell, target: "Navegador", active: true },
  { kind: "webhook", label: "Webhook", icon: Webhook, target: "—", active: false },
];

const EVENTS = [
  "Pieza llega a revisión",
  "Publicación falla",
  "Token expira en <7 días",
  "Cuota API >85%",
  "Boost completado",
  "Pieza alcanza top engagement",
];

export function SettingsNotificationsPage() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Canales de notificación</h3>
      <div className="card divide-y divide-border">
        {CHANNELS.map((c) => (
          <div key={c.kind} className="flex items-center gap-3 p-4">
            <c.icon className="size-4 text-ink-muted" />
            <div className="flex-1">
              <div className="text-sm font-medium">{c.label}</div>
              <div className="text-xs text-ink-muted">{c.target}</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" defaultChecked={c.active} className="peer sr-only" />
              <div className="h-5 w-9 rounded-full bg-hover peer-checked:bg-ws transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold">Eventos a notificar</h3>
      <div className="card p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {EVENTS.map((e) => (
            <label key={e} className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked />
              {e}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
