import { Check, Loader2, AlertTriangle } from "lucide-react";
import type { SaveStatus } from "@/lib/use-autosave";

export function AutosaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
        <Loader2 className="size-3 animate-spin" /> Guardando…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
        <Check className="size-3" /> Guardado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400">
      <AlertTriangle className="size-3" /> Error al guardar
    </span>
  );
}
