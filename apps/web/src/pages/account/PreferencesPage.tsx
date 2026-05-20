import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

export function PreferencesPage() {
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
  }, [theme]);

  return (
    <div>
      <PageHeader title="Preferencias" description="Apariencia y comportamiento global." />
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <div className="card space-y-3 p-5">
          <div>
            <label className="label">Tema</label>
            <div className="mt-2 flex gap-2">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={
                    theme === t
                      ? "btn-primary"
                      : "btn-secondary"
                  }
                >
                  {t === "dark" ? "Oscuro" : t === "light" ? "Claro" : "Sistema"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
