import { useEffect } from "react";
import type { Workspace } from "@pulse/types";

/**
 * Aplica los colores del workspace al :root como variables CSS.
 * Se desmonta automáticamente cuando cambia.
 */
export function useWorkspaceTheme(workspace?: Workspace | null) {
  useEffect(() => {
    const root = document.documentElement;
    if (workspace) {
      root.style.setProperty("--ws-primary", workspace.brandColorPrimary);
      root.style.setProperty(
        "--ws-secondary",
        workspace.brandColorSecondary ?? workspace.brandColorPrimary,
      );
    } else {
      root.style.setProperty("--ws-primary", "#3B82F6");
      root.style.setProperty("--ws-secondary", "#7C5CFC");
    }
  }, [workspace?.id, workspace?.brandColorPrimary, workspace?.brandColorSecondary]);
}
