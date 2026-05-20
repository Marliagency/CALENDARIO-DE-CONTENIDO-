/**
 * Adapter LinkedIn — UGC Posts API.
 *
 * La UGC Posts API permite publicar en perfiles personales sin App Review.
 *
 * Referencias:
 * - OAuth 2.0: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 * - UGC Posts: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
 * - Assets API (upload imagenes): https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/vector-asset-api
 */

import type { SocialAccount, PlatformVariant } from "@prisma/client";
import type { PlatformAdapter, PublishResult } from "./types.js";
import { parseJSON } from "../lib/json.js";

const LI_OAUTH = "https://www.linkedin.com/oauth/v2";
const LI_API = "https://api.linkedin.com/v2";

const LI_HEADERS = {
  "Content-Type": "application/json",
  "X-Restli-Protocol-Version": "2.0.0",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildCaption(variant: PlatformVariant): string {
  const parts: string[] = [];
  if (variant.caption) parts.push(variant.caption);
  const tags = parseJSON<string[]>(variant.hashtags, []);
  if (tags.length > 0) parts.push(tags.join(" "));
  return parts.join("\n\n");
}

interface LinkedInError {
  message?: string;
  status?: number;
  serviceErrorCode?: number;
}

async function checkResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`LinkedIn API error HTTP ${res.status}: ${text}`);
    }
    return {};
  }
  if (!res.ok) {
    const err = json as LinkedInError;
    const msg = err.message ?? `LinkedIn API error HTTP ${res.status}`;
    throw new Error(`LinkedIn [${err.serviceErrorCode ?? res.status}]: ${msg}`);
  }
  return json;
}

// ─── image upload helpers ──────────────────────────────────────────────────────

async function registerImageUpload(
  authorUrn: string,
  accessToken: string,
): Promise<{ asset: string; uploadUrl: string }> {
  const body = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: authorUrn,
      serviceRelationships: [
        {
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        },
      ],
    },
  };

  const res = await fetch(`${LI_API}/assets?action=registerUpload`, {
    method: "POST",
    headers: { ...LI_HEADERS, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const data = (await checkResponse(res)) as {
    value: {
      asset: string;
      uploadMechanism: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
          uploadUrl: string;
        };
      };
    };
  };
  const uploadUrl =
    data.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl;
  return { asset: data.value.asset, uploadUrl };
}

async function uploadImageBinary(uploadUrl: string, imageUrl: string): Promise<void> {
  // Fetch image binary from public URL
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`No se pudo descargar la imagen desde: ${imageUrl}`);
  }
  const imgBuffer = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: imgBuffer,
  });
  if (!uploadRes.ok) {
    throw new Error(`Error subiendo imagen a LinkedIn: HTTP ${uploadRes.status}`);
  }
}

// ─── adapter ───────────────────────────────────────────────────────────────────

export const linkedinAdapter: PlatformAdapter = {
  async exchangeCode(code, redirectUri) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        "LINKEDIN_CLIENT_ID y LINKEDIN_CLIENT_SECRET no configurados. Configura las credenciales en .env.local.",
      );
    }

    // Step 1: exchange code for access token
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenRes = await fetch(`${LI_OAUTH}/accessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const tokenData = (await checkResponse(tokenRes)) as {
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
    };

    const accessToken = tokenData.access_token;
    const expiresAt = new Date(
      Date.now() + (tokenData.expires_in ?? 60 * 24 * 60 * 60) * 1000,
    );

    // Step 2: get user info
    const userRes = await fetch(`${LI_API}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = (await checkResponse(userRes)) as {
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    const displayName =
      userInfo.name ?? [userInfo.given_name, userInfo.family_name].filter(Boolean).join(" ") ?? userInfo.sub;

    return {
      accessToken,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      accountInfo: {
        platformUserId: userInfo.sub,
        handle: displayName,
        displayName,
        avatarUrl: userInfo.picture,
      },
    };
  },

  async refreshToken(_refreshToken) {
    // LinkedIn personal tokens (60 days) do not support refresh for standard OAuth.
    // The user must reconnect when the token expires.
    throw new Error(
      "LinkedIn no soporta refresh de token para cuentas personales. El usuario debe reconectar la cuenta cuando el token expire (60 dias).",
    );
  },

  async publish(account, variant, accessToken, _idempotencyKey) {
    if (!account.platformUserId) {
      throw new Error(
        "Se requiere el ID de usuario de LinkedIn (platformUserId). Edita la cuenta en Ajustes o reconecta via OAuth.",
      );
    }

    const authorUrn = `urn:li:person:${account.platformUserId}`;
    const caption = buildCaption(variant);

    let shareContent: Record<string, unknown>;

    if (variant.mediaUrl) {
      // Upload image to LinkedIn first
      const { asset, uploadUrl } = await registerImageUpload(authorUrn, accessToken);
      await uploadImageBinary(uploadUrl, variant.mediaUrl);

      shareContent = {
        shareCommentary: { text: caption },
        shareMediaCategory: "IMAGE",
        media: [
          {
            status: "READY",
            description: { text: variant.caption ?? "" },
            media: asset,
            title: { text: "" },
          },
        ],
      };
    } else {
      shareContent = {
        shareCommentary: { text: caption },
        shareMediaCategory: "NONE",
      };
    }

    const ugcPost = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": shareContent,
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const postRes = await fetch(`${LI_API}/ugcPosts`, {
      method: "POST",
      headers: { ...LI_HEADERS, Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(ugcPost),
    });
    const postData = (await checkResponse(postRes)) as { id: string };

    return { platformPostId: postData.id, publishedAt: new Date() };
  },

  async fetchMetrics(account, variant, accessToken) {
    if (!variant.platformPostId) {
      throw new Error("No hay platformPostId guardado para esta variante.");
    }

    if (!account.platformUserId) {
      throw new Error("platformUserId requerido para obtener metricas de LinkedIn.");
    }

    const encodedPost = encodeURIComponent(variant.platformPostId);
    const authorUrn = encodeURIComponent(`urn:li:person:${account.platformUserId}`);

    const statsRes = await fetch(
      `${LI_API}/socialActions/${encodedPost}?actor=${authorUrn}`,
      {
        headers: { ...LI_HEADERS, Authorization: `Bearer ${accessToken}` },
      },
    );
    const statsData = (await checkResponse(statsRes)) as {
      likesSummary?: { totalLikes?: number };
      commentsSummary?: { totalFirstLevelComments?: number };
      sharesSummary?: { totalShares?: number };
    };

    // Share stats (impressions/reach) require Organization or marketing API
    return {
      likes: statsData.likesSummary?.totalLikes,
      comments: statsData.commentsSummary?.totalFirstLevelComments,
      shares: statsData.sharesSummary?.totalShares,
      raw: statsData,
    };
  },
};
