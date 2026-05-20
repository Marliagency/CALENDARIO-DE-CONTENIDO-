import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Hook de autoguardado con debounce.
 *
 * Cada cambio en `value` reinicia un timer; cuando para de cambiar durante
 * `delayMs`, llama a `save(value)`.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<unknown>,
  delayMs = 1000,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastError, setLastError] = useState<Error | undefined>();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setStatus("saving");
      setLastError(undefined);
      try {
        await save(value);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch (e) {
        setLastError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    }, delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  return { status, lastError };
}
