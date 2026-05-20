import { Plus } from "lucide-react";

export function SettingsQcRulesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Reglas de calidad (QC)</h3>
        <button type="button" className="btn-primary">
          <Plus className="size-4" /> Nueva regla
        </button>
      </div>
      <div className="card divide-y divide-border">
        {DEFAULT_RULES.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-ink-muted">{r.description}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.platforms.map((p) => (
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
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" defaultChecked className="peer sr-only" />
              <div className="h-5 w-9 rounded-full bg-hover peer-checked:bg-ws transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_RULES = [
  {
    name: "Caption length",
    description: "Verificar que el caption no supera el límite de la plataforma.",
    platforms: ["instagram", "tiktok", "facebook"],
    severity: "warning",
  },
  {
    name: "Hashtag count",
    description: "Avisar si hay más de 30 hashtags (límite IG).",
    platforms: ["instagram"],
    severity: "warning",
  },
  {
    name: "Vídeo duration",
    description: "Validar que la duración encaja en el formato (Reel <90s, Short <60s).",
    platforms: ["instagram", "tiktok", "youtube"],
    severity: "error",
  },
  {
    name: "Aspect ratio",
    description: "Comprobar ratio según formato (Reel 9:16, Feed 1:1 o 4:5).",
    platforms: ["instagram", "tiktok"],
    severity: "error",
  },
  {
    name: "Claims prohibidos",
    description: "Detectar claims del Brand Brain marcados como prohibidos en el caption.",
    platforms: ["instagram", "tiktok", "facebook", "youtube"],
    severity: "error",
  },
];
