/**
 * Cliente HTTP real — habilitado cuando VITE_MOCK_API=0.
 * Mantiene la misma forma que el cliente mock para que las páginas no necesiten
 * cambiar (las páginas usan sync.* en modo mock; cuando se conecten a la API
 * real, se reemplaza por `await http.*`).
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new HttpError(res.status, await safeText(res));
  return res.json();
}

async function post<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(res.status, await safeText(res));
  return res.json();
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return res.statusText;
  }
}

export class HttpError extends Error {
  constructor(public status: number, public bodyText: string) {
    super(`HTTP ${status}: ${bodyText}`);
  }
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(res.status, await safeText(res));
  return res.json();
}

export const http = {
  listWorkspaces: () =>
    get<{ workspaces: unknown[] }>("/api/v1/workspaces").then((r) => r.workspaces),
  getWorkspace: (slug: string) => get(`/api/v1/workspaces/${slug}`),
  updateWorkspace: (slug: string, body: Record<string, unknown>) =>
    patch(`/api/v1/workspaces/${slug}`, body),

  getBrain: (slug: string) => get(`/api/v1/w/${slug}/brain`),
  getPersonas: (slug: string) => get(`/api/v1/w/${slug}/brain/personas`),
  getHooks: (slug: string) => get(`/api/v1/w/${slug}/brain/hooks`),
  getAssets: (slug: string) => get(`/api/v1/w/${slug}/brain/assets`),

  getPieces: (slug: string, status?: string) =>
    get(`/api/v1/w/${slug}/content/pieces${status ? `?status=${status}` : ""}`),
  getAccounts: (slug: string) => get(`/api/v1/w/${slug}/social/accounts`),
  getCampaigns: (slug: string) => get(`/api/v1/w/${slug}/campaigns`),
  getAudiences: (slug: string) => get(`/api/v1/w/${slug}/audiences`),
  getApiKeys: (slug: string) => get(`/api/v1/w/${slug}/api-keys`),
  createApiKey: (slug: string, body: { name: string; scopes: string[] }) =>
    post(`/api/v1/w/${slug}/api-keys`, body),

  getMetricsSummary: (slug: string) =>
    get(`/api/v1/w/${slug}/metrics/summary`),

  // Queue actions
  approvePiece: (slug: string, id: string) =>
    post(`/api/v1/w/${slug}/queue/pieces/${id}/approve`, {}),
  rejectPiece: (slug: string, id: string, reason: string) =>
    post(`/api/v1/w/${slug}/queue/pieces/${id}/reject`, { reason }),
  requestChanges: (slug: string, id: string, reason: string) =>
    post(`/api/v1/w/${slug}/queue/pieces/${id}/request-changes`, { reason }),
  runQc: (slug: string, id: string) =>
    post<{ results: unknown[] }>(`/api/v1/w/${slug}/queue/pieces/${id}/qc`, {}),
  scheduleVariant: (slug: string, variantId: string, scheduledAt: string) =>
    patch(`/api/v1/w/${slug}/queue/variants/${variantId}/schedule`, { scheduledAt }),
  boostVariant: (
    slug: string,
    variantId: string,
    body: {
      enabled: boolean;
      budgetEur: number;
      durationDays: number;
      objective?: string;
      audiencePresetId?: string;
      platforms?: string[];
    },
  ) => patch(`/api/v1/w/${slug}/queue/variants/${variantId}/boost`, body),

  // Audit + analytics
  getAudit: (slug: string, limit = 100) =>
    get(`/api/v1/w/${slug}/audit?limit=${limit}`),

  // Dev-only
  generateDummyMetrics: (slug: string) =>
    post(`/api/v1/w/${slug}/metrics/generate-dummy`, {}),
};

export const isHttpMode = import.meta.env.VITE_MOCK_API !== "1";
