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

const USE_MOCK = import.meta.env.VITE_MOCK_API === "1";

function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const apiClient = {
  // ---------- User & workspaces ----------
  getCurrentUser: () => delay(currentUser),
  listWorkspaces: () => delay(workspaces),
  getWorkspace: (slug: string) => delay(workspaceBySlug(slug)),

  // ---------- Brand brain ----------
  getBrain: (workspaceId: string) => delay(brainForWorkspace(workspaceId)),
  getAssets: (workspaceId: string) => delay(assetsForWorkspace(workspaceId)),
  getPersonas: (workspaceId: string) => delay(personasForWorkspace(workspaceId)),
  getHooks: (workspaceId: string) => delay(hooksForWorkspace(workspaceId)),

  // ---------- Social accounts ----------
  getAccounts: (workspaceId: string) => delay(accountsForWorkspace(workspaceId)),
  getAllAccounts: () => delay(socialAccounts),
  getRateLimits: () => delay(rateLimits),

  // ---------- Content ----------
  getPieces: (workspaceId: string) => delay(piecesForWorkspace(workspaceId)),
  getAllPieces: () => delay(contentPieces),
  getPiece: (id: string) => delay(pieceById(id)),
  getVariantsForPiece: (pieceId: string) => delay(variantsForPiece(pieceId)),
  getVariantsForWorkspace: (workspaceId: string) =>
    delay(variantsForWorkspace(workspaceId)),
  getAllVariants: () => delay(platformVariants),

  // ---------- Metrics ----------
  getDailyMetrics: (workspaceId: string) =>
    delay(dailyMetricsForWorkspace(workspaceId)),
  getAccountMetrics: (workspaceId: string) =>
    delay(accountMetricsForWorkspace(workspaceId)),
  getFormatMetrics: (workspaceId: string) =>
    delay(formatMetricsForWorkspace(workspaceId)),

  // ---------- Misc ----------
  getCampaigns: (workspaceId: string) => delay(campaignsForWorkspace(workspaceId)),
  getAudiences: (workspaceId: string) => delay(audiencesForWorkspace(workspaceId)),
  getApiKeys: (workspaceId: string) => delay(apiKeysForWorkspace(workspaceId)),
};

// Helpers sync (sin loading state) — útiles para datos que ya tenemos en bundle.
export const sync = {
  workspaces: () => workspaces,
  workspace: (slug: string) => workspaceBySlug(slug),
  pieces: (workspaceId: string) => piecesForWorkspace(workspaceId),
  variantsForPiece: (id: string) => variantsForPiece(id),
  variantsForWorkspace: (id: string) => variantsForWorkspace(id),
  accounts: (workspaceId: string) => accountsForWorkspace(workspaceId),
  allAccounts: () => socialAccounts,
  brain: (workspaceId: string) => brainForWorkspace(workspaceId),
  personas: (workspaceId: string) => personasForWorkspace(workspaceId),
  hooks: (workspaceId: string) => hooksForWorkspace(workspaceId),
  assets: (workspaceId: string) => assetsForWorkspace(workspaceId),
  campaigns: (workspaceId: string) => campaignsForWorkspace(workspaceId),
  audiences: (workspaceId: string) => audiencesForWorkspace(workspaceId),
  apiKeys: (workspaceId: string) => apiKeysForWorkspace(workspaceId),
  dailyMetrics: (workspaceId: string) => dailyMetricsForWorkspace(workspaceId),
  accountMetrics: (workspaceId: string) => accountMetricsForWorkspace(workspaceId),
  formatMetrics: (workspaceId: string) => formatMetricsForWorkspace(workspaceId),
  rateLimits: () => rateLimits,
  allPieces: () => contentPieces,
  allVariants: () => platformVariants,
  user: () => currentUser,
};

export const mockMode = USE_MOCK;

export type WorkspaceWithCounts = Workspace & {
  pendingCount: number;
  scheduledCount: number;
  lastPublishedAt?: string;
  accountCount: number;
};

export function workspacesWithCounts(): WorkspaceWithCounts[] {
  return workspaces.map((w) => {
    const pieces = piecesForWorkspace(w.id);
    const pendingStatuses: ContentStatus[] = [
      "in_review",
      "changes_requested",
      "ingest_rejected",
    ];
    const pending = pieces.filter((p) => pendingStatuses.includes(p.status)).length;
    const scheduled = pieces.filter((p) => p.status === "scheduled").length;
    const accounts = accountsForWorkspace(w.id);
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
