export type UUID = string;
export type ISODate = string;

// =====================================================
// Usuarios y workspaces
// =====================================================

export interface User {
  id: UUID;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: ISODate;
}

export type WorkspaceType = "brand" | "personal" | "client" | "other";
export type WorkspaceStatus = "active" | "paused" | "archived";
export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export interface Workspace {
  id: UUID;
  slug: string;
  name: string;
  description?: string;
  type: WorkspaceType;
  brandColorPrimary: string;
  brandColorSecondary?: string;
  brandLogoUrl?: string;
  defaultTimezone: string;
  defaultLanguage: string;
  status: WorkspaceStatus;
  sortOrder: number;
  createdBy: UUID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface WorkspaceMember {
  id: UUID;
  workspaceId: UUID;
  userId: UUID;
  role: WorkspaceRole;
  invitedAt?: ISODate;
  acceptedAt?: ISODate;
}

// =====================================================
// Brand Brain
// =====================================================

export interface Competitor {
  name: string;
  differentiator: string;
}

export interface CopyExample {
  text: string;
  platform: Platform;
  notes?: string;
}

export interface CopyRejected {
  text: string;
  reason: string;
}

export interface BrandBrain {
  id: UUID;
  workspaceId: UUID;
  productDescription: string;
  taglineMain: string;
  taglinesAlt: string[];
  problemSolved: string;
  uniqueValueProp: string;
  whatWeAreNot: string[];
  competitors: Competitor[];
  techStackNotes?: string;
  pricingNotes?: string;
  monetizationNotes?: string;
  brandAdjectives: string[];
  howWeTalk: string;
  howWeDontTalk: string[];
  copyApprovedExamples: CopyExample[];
  copyRejectedExamples: CopyRejected[];
  claimsAllowed: string[];
  claimsForbidden: string[];
  disclaimersRequired: string[];
  updatedAt: ISODate;
  updatedBy?: UUID;
}

export type BrandAssetSection =
  | "logo"
  | "screenshot"
  | "ad_own"
  | "ad_reference"
  | "competitor_ref"
  | "document"
  | "moodboard"
  | "video_ref";

export interface BrandAsset {
  id: UUID;
  workspaceId: UUID;
  section: BrandAssetSection;
  name: string;
  description?: string;
  fileUrl: string;
  fileType?: string;
  fileSizeBytes?: number;
  thumbnailUrl?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  sortOrder: number;
  createdBy?: UUID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface BuyerPersona {
  id: UUID;
  workspaceId: UUID;
  name: string;
  ageRange: string;
  demographics: string;
  dailyContext: string;
  pains: string[];
  jtbdFunctional: string;
  jtbdEmotional: string;
  jtbdSocial: string;
  objections: string[];
  workingHooks: string[];
  promise: string;
  proof: string;
  preferredCta: string;
  preferredPlatforms: Platform[];
  isProTarget: boolean;
  avatarUrl?: string;
  notes?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Hook {
  id: UUID;
  workspaceId: UUID;
  text: string;
  personaId?: UUID;
  format?: ContentFormat;
  hypothesis?: string;
  testedAt?: ISODate;
  contentPieceId?: UUID;
  resultNotes?: string;
  createdAt: ISODate;
}

// =====================================================
// Plataformas y cuentas sociales
// =====================================================

export type Platform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "twitter_x";

export type SocialAccountStatus =
  | "healthy"
  | "needs_reauth"
  | "rate_limited"
  | "disconnected";

export type ActiveFormat =
  | "feed_photo"
  | "feed_video"
  | "reel"
  | "story"
  | "short"
  | "post"
  | "pin"
  | "carousel";

export interface SocialAccount {
  id: UUID;
  workspaceId: UUID;
  platform: Platform;
  nickname: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  platformUserId?: string;
  platformPageId?: string;
  platformIgUserId?: string;
  platformAdvertiserId?: string;
  platformChannelId?: string;
  tokenExpiresAt?: ISODate;
  tokenScope?: string;
  activeFormats: ActiveFormat[];
  isAdsEnabled: boolean;
  status: SocialAccountStatus;
  lastError?: string;
  lastPublishedAt?: ISODate;
  connectedAt: ISODate;
  connectedBy?: UUID;
}

export interface ApiRateLimit {
  socialAccountId: UUID;
  date: string;
  postsUsed: number;
  postsLimit: number;
  quotaUnitsUsed?: number;
  quotaUnitsLimit?: number;
}

// =====================================================
// Contenido y publicaciones
// =====================================================

export type ContentFormat =
  | "image"
  | "carousel"
  | "reel"
  | "ugc_video"
  | "app_demo"
  | "lifestyle_ad"
  | "short"
  | "post";

export type ContentStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "published"
  | "analyzed"
  | "rejected"
  | "failed"
  | "ingest_rejected";

export interface Campaign {
  id: UUID;
  workspaceId: UUID;
  name: string;
  objective: string;
  startAt?: ISODate;
  endAt?: ISODate;
  kpiName?: string;
  kpiTarget?: number;
  notes?: string;
  status: "active" | "paused" | "ended";
}

export interface QcResult {
  rule: string;
  severity: "error" | "warning";
  passed: boolean;
  message?: string;
}

export interface ContentPiece {
  id: UUID;
  workspaceId: UUID;
  externalRef?: UUID;
  title: string;
  format: ContentFormat;
  targetAccounts: UUID[];
  buyerPersonaId?: UUID;
  campaignId?: UUID;
  frameworkUsed?: string;
  hookUsed?: string;
  conceptId?: string;
  status: ContentStatus;
  qcResults: QcResult[];
  source: "manual" | "studio";
  notes?: string;
  createdBy?: UUID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PlatformVariant {
  id: UUID;
  contentPieceId: UUID;
  workspaceId: UUID;
  socialAccountId: UUID;
  platform: Platform;
  mediaUrl?: string;
  thumbnailUrl?: string;
  mediaType?: "image" | "video" | "carousel";
  ratio?: string;
  durationS?: number;
  caption?: string;
  hashtags: string[];
  firstComment?: string;
  musicRef?: string;
  ctaText?: string;
  ctaUrl?: string;
  boostEnabled: boolean;
  boostBudgetEur: number;
  boostDurationDays?: number;
  boostDailyBudgetEur?: number;
  boostObjective?: string;
  boostAudiencePresetId?: UUID;
  boostPlatforms: Platform[];
  scheduledAt?: ISODate;
  publishedAt?: ISODate;
  platformPostId?: string;
  status: "pending" | "scheduled" | "publishing" | "published" | "failed";
  createdAt: ISODate;
}

export interface AudiencePreset {
  id: UUID;
  workspaceId: UUID;
  name: string;
  platform?: Platform;
  geo: string[];
  ageMin: number;
  ageMax: number;
  languages: string[];
  interests: string[];
}

// =====================================================
// Métricas
// =====================================================

export interface Metric {
  id: UUID;
  platformVariantId: UUID;
  workspaceId: UUID;
  fetchedAt: ISODate;
  kind: "organic" | "paid";
  reach: number;
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileVisits?: number;
  follows?: number;
  watchTimeS?: number;
  completionRate?: number;
  hookRate?: number;
  holdRate?: number;
  spendCents?: number;
  cpmCents?: number;
  cpcCents?: number;
  ctr?: number;
  cpaCents?: number;
  roas?: number;
}

// =====================================================
// Sistema
// =====================================================

export interface QcRule {
  id: UUID;
  workspaceId: UUID;
  name: string;
  appliesToFormats: ContentFormat[];
  appliesToPlatforms: Platform[];
  ruleType: string;
  params: Record<string, unknown>;
  severity: "error" | "warning";
  active: boolean;
}

export interface NotificationChannel {
  id: UUID;
  workspaceId: UUID;
  kind: "email" | "slack" | "telegram" | "push" | "webhook";
  target: string;
  events: string[];
  active: boolean;
}

export interface WorkspaceApiKey {
  id: UUID;
  workspaceId: UUID;
  name: string;
  keyPrefix: string;
  scopes: ("ingest" | "read_brain" | "read_metrics")[];
  lastUsedAt?: ISODate;
  expiresAt?: ISODate;
  createdAt: ISODate;
}

export interface AuditLog {
  id: UUID;
  workspaceId: UUID;
  entityType: string;
  entityId?: UUID;
  action: string;
  fromValue?: string;
  toValue?: string;
  actorId?: UUID;
  notes?: string;
  createdAt: ISODate;
}
