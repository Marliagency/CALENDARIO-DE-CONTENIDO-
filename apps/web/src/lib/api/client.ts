import {
  accountMetricsForWorkspace,
  accountsForWorkspace,
  apiKeysForWorkspace,
  audiencesForWorkspace,
  assetsForWorkspace,
  brainForWorkspace,
  campaignsForWorkspace,
  contentPieces,
  currentUser,
  dailyMetricsForWorkspace,
  formatMetricsForWorkspace,
  hooksForWorkspace,
  pieceById,
  piecesForWorkspace,
  platformVariants,
  personasForWorkspace,
  rateLimits,
  socialAccounts,
  variantsForPiece,
  variantsForWorkspace,
  workspaceBySlug,
  workspaces,
} from "@pulse/mock-data";
import type { ContentStatus, Workspace } from "@pulse/types";
import { dataCache } from "./data-cache";

const USE_MOCK = true; // Force mock mode
export const mockMode = USE_MOCK;

// ---------- Sync API: lee de mock-data en mock mode, de dataCache en HTTP mode ----------

export const sync = {
  workspaces: () => (USE_MOCK ? workspaces : dataCache.workspaces),
  workspace: (slug: string) =>
    USE_MOCK
      ? workspaceBySlug(slug)
      : dataCache.workspaces.find((w) => w.slug === slug),

  pieces: (workspaceId: string) =>
    USE_MOCK
      ? piecesForWorkspace(workspaceId)
      : dataCache.pieces.filter((p) => p.workspaceId === workspaceId),

  variantsForPiece: (id: string) =>
    USE_MOCK
      ? variantsForPiece(id)
      : dataCache.variants.filter((v) => v.contentPieceId === id),

  variantsForWorkspace: (id: string) =>
    USE_MOCK
      ? variantsForWorkspace(id)
      : dataCache.variants.filter((v) => v.workspaceId === id),

  accounts: (workspaceId: string) =>
    USE_MOCK
      ? accountsForWorkspace(workspaceId)
      : dataCache.accounts.filter((a) => a.workspaceId === workspaceId),

  allAccounts: () => (USE_MOCK ? socialAccounts : dataCache.accounts),

  brain: (workspaceId: string) =>
    USE_MOCK
      ? brainForWorkspace(workspaceId)
      : dataCache.brains.find((b) => b.workspaceId === workspaceId),

  personas: (workspaceId: string) =>
    USE_MOCK
      ? personasForWorkspace(workspaceId)
      : dataCache.personas.filter((p) => p.workspaceId === workspaceId),

  hooks: (workspaceId: string) =>
    USE_MOCK
      ? hooksForWorkspace(workspaceId)
      : dataCache.hooks.filter((h) => h.workspaceId === workspaceId),

  assets: (workspaceId: string) =>
    USE_MOCK
      ? assetsForWorkspace(workspaceId)
      : dataCache.assets.filter((a) => a.workspaceId === workspaceId),

  campaigns: (workspaceId: string) =>
    USE_MOCK
      ? campaignsForWorkspace(workspaceId)
      : dataCache.campaigns.filter((c) => c.workspaceId === workspaceId),

  audiences: (workspaceId: string) =>
    USE_MOCK
      ? audiencesForWorkspace(workspaceId)
      : dataCache.audiences.filter((a) => a.workspaceId === workspaceId),

  apiKeys: (workspaceId: string) =>
    USE_MOCK
      ? apiKeysForWorkspace(workspaceId)
      : dataCache.apiKeys.filter((k) => k.workspaceId === workspaceId),

  // Métricas agregadas: mock-data o cache HTTP (poblada al login con prefetch).
  dailyMetrics: (workspaceId: string) =>
    USE_MOCK
      ? dailyMetricsForWorkspace(workspaceId)
      : dataCache.dailyMetrics.filter((m) => m.workspaceId === workspaceId),
  accountMetrics: (workspaceId: string) =>
    USE_MOCK
      ? accountMetricsForWorkspace(workspaceId)
      : dataCache.accountMetrics.filter((m) => m.workspaceId === workspaceId),
  formatMetrics: (workspaceId: string) =>
    USE_MOCK
      ? formatMetricsForWorkspace(workspaceId)
      : dataCache.formatMetrics.filter((m) => m.workspaceId === workspaceId),

  rateLimits: () => (USE_MOCK ? rateLimits : []),

  allPieces: () => (USE_MOCK ? contentPieces : dataCache.pieces),
  allVariants: () => (USE_MOCK ? platformVariants : dataCache.variants),

  pieceById: (id: string) =>
    USE_MOCK ? pieceById(id) : dataCache.pieces.find((p) => p.id === id),

  user: () => currentUser, // El user real viene de useAuth(), no de aquí
};

// ---------- Async API (legacy — se mantiene para compatibilidad) ----------

function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const apiClient = {
  getCurrentUser: () => delay(currentUser),
  listWorkspaces: () => delay(workspaces),
  getWorkspace: (slug: string) => delay(workspaceBySlug(slug)),
  getBrain: (workspaceId: string) => delay(brainForWorkspace(workspaceId)),
  getAssets: (workspaceId: string) => delay(assetsForWorkspace(workspaceId)),
  getPersonas: (workspaceId: string) => delay(personasForWorkspace(workspaceId)),
  getHooks: (workspaceId: string) => delay(hooksForWorkspace(workspaceId)),
  getAccounts: (workspaceId: string) => delay(accountsForWorkspace(workspaceId)),
  getAllAccounts: () => delay(socialAccounts),
  getRateLimits: () => delay(rateLimits),
  getPieces: (workspaceId: string) => delay(piecesForWorkspace(workspaceId)),
  getAllPieces: () => delay(contentPieces),
  getPiece: (id: string) => delay(pieceById(id)),
  getVariantsForPiece: (pieceId: string) => delay(variantsForPiece(pieceId)),
  getVariantsForWorkspace: (workspaceId: string) =>
    delay(variantsForWorkspace(workspaceId)),
  getAllVariants: () => delay(platformVariants),
  getDailyMetrics: (workspaceId: string) =>
    delay(dailyMetricsForWorkspace(workspaceId)),
  getAccountMetrics: (workspaceId: string) =>
    delay(accountMetricsForWorkspace(workspaceId)),
  getFormatMetrics: (workspaceId: string) =>
    delay(formatMetricsForWorkspace(workspaceId)),
  getCampaigns: (workspaceId: string) => delay(campaignsForWorkspace(workspaceId)),
  getAudiences: (workspaceId: string) => delay(audiencesForWorkspace(workspaceId)),
  getApiKeys: (workspaceId: string) => delay(apiKeysForWorkspace(workspaceId)),
};

export type WorkspaceWithCounts = Workspace & {
  pendingCount: number;
  scheduledCount: number;
  lastPublishedAt?: string;
  accountCount: number;
};

export function workspacesWithCounts(): WorkspaceWithCounts[] {
  const ws = sync.workspaces();
  return ws.map((w) => {
    const pieces = sync.pieces(w.id);
    const pendingStatuses: ContentStatus[] = [
      "in_review",
      "changes_requested",
      "ingest_rejected",
    ];
    const pending = pieces.filter((p) => pendingStatuses.includes(p.status)).length;
    const scheduled = pieces.filter((p) => p.status === "scheduled").length;
    const accounts = sync.accounts(w.id);
    const lastPub = accounts
      .map((a) => a.lastPublishedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    return {
      ...w,
      pendingCount: pending,
      scheduledCount: scheduled,
      lastPublishedAt: lastPub,
      accountCount: accounts.length,
    };
  });
}
