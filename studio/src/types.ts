// Studio types — shared shapes between modules. Mirror the Pulse API.

export type Platform =
  | "tiktok"
  | "instagram_reel"
  | "instagram_feed"
  | "instagram_story"
  | "facebook_reel"
  | "facebook_feed"
  | "youtube_short"
  | "linkedin"
  | "pinterest"
  | "twitter_x";

export type Format =
  | "ugc_video"
  | "lifestyle_ad"
  | "app_demo"
  | "ui_demo"
  | "motion_graphic"
  | "data_animation"
  | "text_video"
  | "logo_animation"
  | "svg_motion"
  | "canva_design"
  | "carousel"
  | "image"
  | "voiceover";

export interface ContentProfile {
  primary_formats?: Format[];
  avoid_formats?: Format[];
  free_first?: boolean;
  posting_frequency?: number;
  content_split?: Record<string, number>;
}

export interface BuyerPersona {
  id: string;
  name: string;
  pains: string[];
  jtbdFunctional?: string | null;
  workingHooks: string[];
  preferredPlatforms: Platform[];
  preferredCta?: string | null;
}

export interface BrandAsset {
  id: string;
  section: string;
  name: string;
  fileUrl: string;
  metadata: Record<string, unknown>;
}

export interface BrandBrain {
  workspaceId: string;
  slug: string;
  workspaceType?: "brand" | "personal" | "client" | "other";
  brandColorPrimary?: string;
  brandColorSecondary?: string | null;
  taglineMain: string;
  uniqueValueProp: string;
  brandAdjectives: string[];
  whatWeAreNot: string[];
  competitors: { name: string; differentiator: string }[];
  claimsAllowed: string[];
  claimsForbidden: string[];
  disclaimersRequired: string[];
  contentProfile: ContentProfile;
  personas: BuyerPersona[];
  assets: BrandAsset[];
  hooks: { id: string; text: string; personaId?: string | null }[];
}

export interface Brief {
  workspace: string;
  persona: BuyerPersona;
  format: Format;
  targetPlatforms: Platform[];
  freeFirst: boolean;
  primaryFormats: Format[];
  avoidFormats: Format[];
  isBatch?: boolean;
  usePletorWorkflow?: boolean;
  brand: {
    tagline: string;
    uvp: string;
    adjectives: string[];
    whatWeAreNot: string[];
    palette: string;
    claimsAllowed: string[];
    claimsForbidden: string[];
    disclaimers: string[];
  };
  references: {
    logoUrl?: string;
    screenshots: BrandAsset[];
    adReferences: BrandAsset[];
    ownAds: BrandAsset[];
    documents: BrandAsset[];
  };
  hooks: { id: string; text: string }[];
  campaignId?: string;
}

export interface PlatformVariant {
  platform: Platform;
  mediaUrl: string;          // local path or remote URL of the rendered asset
  ratio: string;             // "9:16" | "1:1" | "4:5" ...
  durationSec?: number;
  caption: string;
  hashtags: string[];
  firstComment?: string;
  ctaText?: string;
  ctaUrl?: string;
  hasLogoOverlay: boolean;
  hasEarlyHook: boolean;
  hasBurnedSubtitles: boolean;
}

export interface ContentPiece {
  creativeRunId: string;
  title: string;
  format: Format;
  personaId: string;
  campaignId?: string | null;
  framework: string;
  hookText: string;
  tool: string;
  model?: string;
  creditsSpent: number;
  promptHash: string;
  suggestedBoost?: number;
  persona: BuyerPersona;
}

export interface QCResult {
  passed: boolean;
  failed: string[];
}

export interface ModelChoice {
  tool:
    | "remotion"
    | "svg_to_mp4"
    | "canva_mcp"
    | "mcp_image"
    | "elevenlabs_mcp"
    | "higgsfield_skills"
    | "pletor_mcp";
  command?: string;
  model?: string;
  estimatedCost?: number;
  estimatedCredits?: number;
  requiresConfirmation?: boolean;
  note?: string;
  alternativeIfRejected?: ModelChoice;
}

export interface PushPayload {
  external_ref: string;
  title: string;
  format: string;
  buyer_persona_id: string;
  campaign_id?: string | null;
  framework_used?: string;
  hook_used?: string;
  creative_run_metadata?: Record<string, unknown>;
  platform_variants: Record<string, PushVariant>;
  suggested_schedule?: Record<string, string>;
  suggested_boost_budget_eur?: number;
}

export interface PushVariant {
  social_account_nickname?: string;
  social_account_id?: string;
  media_url: string;
  ratio?: string;
  duration_s?: number;
  caption?: string;
  hashtags?: string[];
  first_comment?: string;
  cta_text?: string;
  cta_url?: string;
}

export interface PushResult {
  success: boolean;
  contentPieceId?: string;
  error?: string;
  status?: number;
}
