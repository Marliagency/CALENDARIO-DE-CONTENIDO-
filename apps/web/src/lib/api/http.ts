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
  retryAfterSec?: number;
  constructor(public status: number, public bodyText: string) {
    super(`HTTP ${status}: ${bodyText}`);
    if (status === 429) {
      try {
        const body = JSON.parse(bodyText);
        this.retryAfterSec = body.retryAfterSec;
      } catch {
        /* ignore */
      }
    }
  }
  get isRateLimit() {
    return this.status === 429;
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
  updateBrain: (slug: string, body: Record<string, unknown>) =>
    patch(`/api/v1/w/${slug}/brain`, body),
  getPersonas: (slug: string) => get(`/api/v1/w/${slug}/brain/personas`),
  createPersona: (slug: string, body: Record<string, unknown>) =>
    post(`/api/v1/w/${slug}/brain/personas`, body),
  updatePersona: (slug: string, id: string, body: Record<string, unknown>) =>
    patch(`/api/v1/w/${slug}/brain/personas/${id}`, body),
  deletePersona: (slug: string, id: string) =>
    fetch(`${BASE}/api/v1/w/${slug}/brain/personas/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new HttpError(r.status, "");
    }),
  getHooks: (slug: string) => get(`/api/v1/w/${slug}/brain/hooks`),
  getAssets: (slug: string, section?: string) =>
    get(`/api/v1/w/${slug}/brain/assets${section ? `?section=${section}` : ""}`),

  uploadAsset: async (slug: string, file: File, section: string, name?: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("section", section);
    if (name) form.append("name", name);
    const res = await fetch(`${BASE}/api/v1/w/${slug}/uploads`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new HttpError(res.status, await safeText(res));
    return res.json();
  },

  createWorkspace: (body: {
    slug: string;
    name: string;
    type: string;
    description?: string;
    brandColorPrimary?: string;
    brandColorSecondary?: string;
  }) => post("/api/v1/workspaces", body),

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
  getDailyMetrics: (slug: string, days = 7) =>
    get(`/api/v1/w/${slug}/metrics/daily?days=${days}`),
  getAccountMetrics: (slug: string) =>
    get(`/api/v1/w/${slug}/metrics/by-account`),
  getFormatMetrics: (slug: string) =>
    get(`/api/v1/w/${slug}/metrics/by-format`),

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

  updateToken: (body: {
    workspaceSlug: string;
    accountId: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    platformUserId?: string;
    platformIgUserId?: string;
    platformPageId?: string;
    platformChannelId?: string;
  }) => post<{ ok: boolean }>(`/api/v1/oauth/update-token`, body),

  // Social accounts
  updateAccount: (
    slug: string,
    id: string,
    body: Partial<{
      nickname: string;
      handle: string;
      activeFormats: string[];
      isAdsEnabled: boolean;
      status: "healthy" | "warning" | "expired" | "disabled";
    }>,
  ) => patch(`/api/v1/w/${slug}/social/accounts/${id}`, body),
  deleteAccount: (slug: string, id: string) =>
    fetch(`${BASE}/api/v1/w/${slug}/social/accounts/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new HttpError(r.status, "");
    }),

  // OAuth / connection
  oauthStart: (
    platform: string,
    workspaceSlug: string,
  ) =>
    get<{ configured: boolean; url?: string; state?: string; message?: string }>(
      `/api/v1/oauth/${platform}/start?workspace=${workspaceSlug}`,
    ),
  devConnect: (body: {
    workspaceSlug: string;
    platform: string;
    nickname: string;
    handle: string;
    activeFormats?: string[];
  }) =>
    post<{ id: string; handle: string; platform: string; note: string }>(
      `/api/v1/oauth/dev-connect`,
      body,
    ),

  // Audit + analytics
  getAudit: (slug: string, limit = 100) =>
    get(`/api/v1/w/${slug}/audit?limit=${limit}`),

  createPiece: (
    slug: string,
    body: {
      title: string;
      format: string;
      targetAccounts?: string[];
      buyerPersonaId?: string;
      campaignId?: string;
      notes?: string;
      status?: "draft" | "in_review";
    },
  ) => post<import("@pulse/types").ContentPiece>(`/api/v1/w/${slug}/content/pieces`, body),

  updatePiece: (slug: string, id: string, body: Record<string, unknown>) =>
    patch(`/api/v1/w/${slug}/content/pieces/${id}`, body),

  deletePiece: (slug: string, id: string) =>
    fetch(`${BASE}/api/v1/w/${slug}/content/pieces/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new HttpError(r.status, "");
    }),

  createVariant: (
    slug: string,
    pieceId: string,
    body: {
      socialAccountId: string;
      platform: string;
      caption?: string;
      hashtags?: string[];
      mediaUrl?: string;
      scheduledAt?: string;
    },
  ) => post(`/api/v1/w/${slug}/content/pieces/${pieceId}/variants`, body),

  createCampaign: (
    slug: string,
    body: {
      name: string;
      objective?: string;
      startAt?: string;
      endAt?: string;
      kpiName?: string;
      kpiTarget?: number;
      notes?: string;
    },
  ) => post<unknown>(`/api/v1/w/${slug}/campaigns`, body),

  deleteCampaign: (slug: string, id: string) =>
    fetch(`${BASE}/api/v1/w/${slug}/campaigns/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new HttpError(r.status, "");
    }),

  updateProfile: (body: {
    name?: string;
    email?: string;
    avatarUrl?: string | null;
    notificationPrefs?: Record<string, unknown>;
  }) =>
    patch<{
      id: string;
      name?: string;
      email: string;
      avatarUrl?: string;
      notificationPrefs?: Record<string, unknown>;
    }>("/api/v1/auth/me", body),

  getQcRules: (slug: string) =>
    get<import("@pulse/types").QcRule[]>(`/api/v1/w/${slug}/brain/qc-rules`),
  createQcRule: (slug: string, body: Record<string, unknown>) =>
    post<import("@pulse/types").QcRule>(`/api/v1/w/${slug}/brain/qc-rules`, body),
  updateQcRule: (slug: string, ruleId: string, body: Record<string, unknown>) =>
    patch(`/api/v1/w/${slug}/brain/qc-rules/${ruleId}`, body),
  deleteQcRule: (slug: string, ruleId: string) =>
    fetch(`${BASE}/api/v1/w/${slug}/brain/qc-rules/${ruleId}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new HttpError(r.status, "");
    }),

  // Dev-only
  generateDummyMetrics: (slug: string) =>
    post(`/api/v1/w/${slug}/metrics/generate-dummy`, {}),

  // Notifications
  getNotifications: (unreadOnly = false, limit = 50) =>
    get<{ items: Notification[]; unreadCount: number }>(
      `/api/v1/notifications?unreadOnly=${unreadOnly}&limit=${limit}`,
    ),
  markNotificationRead: (id: string) =>
    post(`/api/v1/notifications/${id}/read`, {}),
  markAllRead: () => post(`/api/v1/notifications/read-all`, {}),
  dismissNotification: (id: string) =>
    fetch(`${BASE}/api/v1/notifications/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new HttpError(r.status, "");
    }),
};

export interface Notification {
  id: string;
  workspaceId?: string;
  userId?: string;
  kind: string;
  severity: "info" | "warning" | "error";
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  url?: string;
  readAt?: string;
  createdAt: string;
}

export const isHttpMode = import.meta.env.VITE_MOCK_API !== "1";
