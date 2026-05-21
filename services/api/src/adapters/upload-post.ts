/**
 * Adapter para Upload-Post (https://upload-post.com).
 *
 * Sustituye al stack de adapters propios (Meta, TikTok, etc.) por una unica
 * pasarela que ya tiene resuelto el OAuth de todas las redes. Una sola API
 * key da acceso a: tiktok, instagram, facebook, youtube, linkedin, x,
 * threads, pinterest, reddit, bluesky.
 *
 * La key y los nombres de perfil viven en .env.local (cargadas por el wrapper
 * dotenv-cli del package.json; este modulo solo lee process.env).
 */

export type UploadPostPlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "x"
  | "threads"
  | "pinterest"
  | "reddit"
  | "bluesky";

export interface PublishVideoOptions {
  profile: string;
  platforms: UploadPostPlatform[];
  videoUrl: string;
  title: string;
  scheduledAt?: string;

  // Overrides por plataforma
  tiktokTitle?: string;
  instagramTitle?: string;
  youtubeTitle?: string;
  linkedinTitle?: string;
  facebookTitle?: string;

  // Opciones especificas de TikTok
  tiktokPrivacy?:
    | "PUBLIC_TO_EVERYONE"
    | "MUTUAL_FOLLOW_FRIENDS"
    | "FOLLOWER_OF_CREATOR"
    | "SELF_ONLY";
  tiktokDisableComment?: boolean;
  tiktokDisableDuet?: boolean;
  tiktokDisableStitch?: boolean;
  tiktokIsAiGenerated?: boolean;
}

export interface PublishImageOptions {
  profile: string;
  platforms: UploadPostPlatform[];
  imageUrls: string[];
  title: string;
  scheduledAt?: string;
  instagramTitle?: string;
  facebookTitle?: string;
}

export interface PublishResult {
  success: boolean;
  uploadId?: string;
  error?: string;
}

export interface UploadStatus {
  uploadId: string;
  status: "pending" | "processing" | "published" | "failed";
  platforms: Partial<
    Record<
      UploadPostPlatform,
      {
        status: "published" | "failed" | "pending";
        postUrl?: string;
        postId?: string;
        error?: string;
      }
    >
  >;
}

function apiBase(): string {
  return process.env.UPLOAD_POST_API_BASE ?? "https://api.upload-post.com";
}

function apiKey(): string {
  const key = process.env.UPLOAD_POST_API_KEY;
  if (!key) {
    throw new Error(
      "UPLOAD_POST_API_KEY no configurada en .env.local. Crea una en app.upload-post.com.",
    );
  }
  return key;
}

async function apiCall<T = Record<string, unknown>>(
  endpoint: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${apiBase()}${endpoint}`, {
    method,
    headers: {
      Authorization: `ApiKey ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload-Post ${res.status} en ${endpoint}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function publishVideo(opts: PublishVideoOptions): Promise<PublishResult> {
  try {
    const payload: Record<string, unknown> = {
      profile: opts.profile,
      "platform[]": opts.platforms,
      url: opts.videoUrl,
      title: opts.title,
    };
    if (opts.scheduledAt) payload.scheduled_at = opts.scheduledAt;

    if (opts.tiktokTitle) payload.tiktok_title = opts.tiktokTitle;
    if (opts.instagramTitle) payload.instagram_title = opts.instagramTitle;
    if (opts.youtubeTitle) payload.youtube_title = opts.youtubeTitle;
    if (opts.linkedinTitle) payload.linkedin_title = opts.linkedinTitle;
    if (opts.facebookTitle) payload.facebook_title = opts.facebookTitle;

    if (opts.tiktokPrivacy) payload.tiktok_privacy = opts.tiktokPrivacy;
    if (opts.tiktokDisableComment) payload.tiktok_disable_comment = true;
    if (opts.tiktokDisableDuet) payload.tiktok_disable_duet = true;
    if (opts.tiktokDisableStitch) payload.tiktok_disable_stitch = true;
    if (opts.tiktokIsAiGenerated) payload.tiktok_is_ai_generated = true;

    const result = await apiCall<{ id: string }>("/api/upload", "POST", payload);
    return { success: true, uploadId: result.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function publishImage(opts: PublishImageOptions): Promise<PublishResult> {
  try {
    const payload: Record<string, unknown> = {
      profile: opts.profile,
      "platform[]": opts.platforms,
      "image[]": opts.imageUrls,
      title: opts.title,
    };
    if (opts.scheduledAt) payload.scheduled_at = opts.scheduledAt;
    if (opts.instagramTitle) payload.instagram_title = opts.instagramTitle;
    if (opts.facebookTitle) payload.facebook_title = opts.facebookTitle;

    const result = await apiCall<{ id: string }>("/api/upload_photos", "POST", payload);
    return { success: true, uploadId: result.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getUploadStatus(uploadId: string): Promise<UploadStatus> {
  const result = await apiCall<UploadStatus>(`/api/upload/${uploadId}`, "GET");
  return result;
}

export async function listProfiles(): Promise<
  Array<{ username: string; social_accounts: Record<string, string | null> }>
> {
  const result = await apiCall<{
    profiles: Array<{ username: string; social_accounts: Record<string, string | null> }>;
  }>("/api/uploadposts/users", "GET");
  return result.profiles ?? [];
}

/**
 * Resuelve el nombre del perfil de Upload-Post para un workspace.
 * Lee UPLOAD_POST_PROFILE_<SLUG_UPPER_CON_UNDERSCORES>.
 */
export function getProfileForWorkspace(workspaceSlug: string): string {
  const key = `UPLOAD_POST_PROFILE_${workspaceSlug.toUpperCase().replace(/-/g, "_")}`;
  const profile = process.env[key];
  if (!profile) {
    throw new Error(
      `No hay perfil de Upload-Post para el workspace "${workspaceSlug}". ` +
        `Añade ${key}=nombre_perfil a .env.local.`,
    );
  }
  return profile;
}

/**
 * Mapea las plataformas internas de Pulse (instagram_reel, facebook_feed...)
 * al nombre que espera Upload-Post (instagram, facebook...).
 */
export function mapPlatformName(platform: string): UploadPostPlatform | null {
  const map: Record<string, UploadPostPlatform> = {
    tiktok: "tiktok",
    instagram: "instagram",
    instagram_reel: "instagram",
    instagram_feed: "instagram",
    instagram_story: "instagram",
    facebook: "facebook",
    facebook_feed: "facebook",
    facebook_reel: "facebook",
    youtube: "youtube",
    youtube_short: "youtube",
    linkedin: "linkedin",
    linkedin_post: "linkedin",
    twitter_x: "x",
    x: "x",
    x_post: "x",
    threads: "threads",
    pinterest: "pinterest",
    reddit: "reddit",
    bluesky: "bluesky",
  };
  return map[platform] ?? null;
}
