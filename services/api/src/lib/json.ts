// Helpers para serializar/deserializar campos JSON-as-text en SQLite.
export function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJSON(value: unknown): string {
  return JSON.stringify(value ?? null);
}
