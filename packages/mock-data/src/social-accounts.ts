import type { ApiRateLimit, SocialAccount } from "@pulse/types";

export const socialAccounts: SocialAccount[] = [
  // QYRO
  {
    id: "acc-qyro-ig-app",
    workspaceId: "ws-qyro",
    platform: "instagram",
    nickname: "IG QYRO",
    handle: "@qyro_app",
    displayName: "QYRO",
    activeFormats: ["feed_photo", "feed_video", "reel", "carousel"],
    isAdsEnabled: true,
    status: "healthy",
    tokenExpiresAt: "2026-07-20T00:00:00Z",
    lastPublishedAt: "2026-05-20T11:00:00Z",
    connectedAt: "2026-01-12T09:30:00Z",
    connectedBy: "user-diego",
  },
  {
    id: "acc-qyro-tt-app",
    workspaceId: "ws-qyro",
    platform: "tiktok",
    nickname: "TikTok QYRO",
    handle: "@qyro_app",
    displayName: "QYRO",
    activeFormats: ["feed_video"],
    isAdsEnabled: true,
    status: "healthy",
    tokenExpiresAt: "2026-08-15T00:00:00Z",
    platformAdvertiserId: "tt-adv-12345",
    lastPublishedAt: "2026-05-20T09:00:00Z",
    connectedAt: "2026-01-12T10:00:00Z",
  },
  {
    id: "acc-qyro-tt-latam",
    workspaceId: "ws-qyro",
    platform: "tiktok",
    nickname: "TikTok QYRO LATAM",
    handle: "@qyro_latam",
    displayName: "QYRO Latam",
    activeFormats: ["feed_video"],
    isAdsEnabled: false,
    status: "healthy",
    tokenExpiresAt: "2026-08-15T00:00:00Z",
    lastPublishedAt: "2026-05-19T18:00:00Z",
    connectedAt: "2026-04-02T10:00:00Z",
  },
  {
    id: "acc-qyro-fb-page",
    workspaceId: "ws-qyro",
    platform: "facebook",
    nickname: "Facebook Page QYRO",
    handle: "QYRO",
    displayName: "QYRO Page",
    activeFormats: ["post", "feed_video", "reel"],
    isAdsEnabled: true,
    status: "needs_reauth",
    tokenExpiresAt: "2026-05-23T00:00:00Z",
    lastError: "Token expira en 3 días",
    lastPublishedAt: "2026-05-20T21:00:00Z",
    connectedAt: "2026-01-12T11:00:00Z",
  },
  // Personal
  {
    id: "acc-personal-tt",
    workspaceId: "ws-personal",
    platform: "tiktok",
    nickname: "TikTok Diego",
    handle: "@diego_xyz",
    displayName: "Diego",
    activeFormats: ["feed_video"],
    isAdsEnabled: false,
    status: "healthy",
    tokenExpiresAt: "2026-09-01T00:00:00Z",
    lastPublishedAt: "2026-05-19T19:00:00Z",
    connectedAt: "2026-02-04T10:00:00Z",
  },
  {
    id: "acc-personal-ig",
    workspaceId: "ws-personal",
    platform: "instagram",
    nickname: "IG Diego Personal",
    handle: "@diego.personal",
    displayName: "Diego",
    activeFormats: ["feed_photo", "reel", "story"],
    isAdsEnabled: false,
    status: "rate_limited",
    tokenExpiresAt: "2026-09-01T00:00:00Z",
    lastError: "Cuota Instagram al 92% — espera 4h",
    lastPublishedAt: "2026-05-18T20:00:00Z",
    connectedAt: "2026-02-04T11:00:00Z",
  },
  {
    id: "acc-personal-yt",
    workspaceId: "ws-personal",
    platform: "youtube",
    nickname: "YouTube Diego",
    handle: "DiegoXYZ",
    displayName: "Diego XYZ",
    activeFormats: ["short", "feed_video"],
    isAdsEnabled: false,
    status: "healthy",
    tokenExpiresAt: "2026-12-01T00:00:00Z",
    connectedAt: "2026-03-15T09:00:00Z",
  },
];

export function accountsForWorkspace(workspaceId: string): SocialAccount[] {
  return socialAccounts.filter((a) => a.workspaceId === workspaceId);
}

export function accountById(id: string): SocialAccount | undefined {
  return socialAccounts.find((a) => a.id === id);
}

export const rateLimits: ApiRateLimit[] = [
  { socialAccountId: "acc-qyro-ig-app", date: "2026-05-20", postsUsed: 3, postsLimit: 25 },
  { socialAccountId: "acc-qyro-tt-app", date: "2026-05-20", postsUsed: 2, postsLimit: 30 },
  { socialAccountId: "acc-qyro-fb-page", date: "2026-05-20", postsUsed: 1, postsLimit: 50 },
  { socialAccountId: "acc-personal-ig", date: "2026-05-20", postsUsed: 23, postsLimit: 25 },
  { socialAccountId: "acc-personal-yt", date: "2026-05-20", postsUsed: 4, postsLimit: 6, quotaUnitsUsed: 8500, quotaUnitsLimit: 10000 },
];
