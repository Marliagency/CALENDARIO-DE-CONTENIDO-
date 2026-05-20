/**
 * Adapter Twitter/X — API v2.
 *
 * El Free tier de Twitter API v2 permite crear tweets (POST /2/tweets).
 * El upload de media requiere la v1.1 con OAuth 1.0a, que es significativamente
 * mas complejo; por ello en este adapter se publica solo texto (o texto + URL
 * de media como enlace si se proporciona mediaUrl).
 *
 * OAuth 2.0 PKCE es el flujo estandar para apps de usuario unico.
 *
 * Referencias:
 * - OAuth 2.0 PKCE: https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code
 * - POST /2/tweets: https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
 * - GET /2/tweets/:id: https://developer.twitter.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets-id
 */

import type { SocialAccount, PlatformVariant } from "@prisma/client";
import type { PlatformAdapter, PublishResult } from "./types.js";
import { parseJSON } from "../lib/json.js";

const TWITTER_API = "https://api.twitter.com/2";
const TWITTER_OAUTH = "https://api.twitter.com/2/oauth2/token";

const MAX_TWEET_CHARS = 280;

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildTweetText(variant: PlatformVariant): string {
  const parts: string[] = [];
  if (variant.caption) parts.push(variant.caption);
  const tags = parseJSON<string[]>(variant.hashtags, []);
  if (tags.length > 0) parts.push(tags.join(" "));
  let text = parts.join("\n\n");

  // Twitter enforces 280 character limit
  if (text.length > MAX_TWEET_CHARS) {
    text = text.slice(0, MAX_TWEET_CHARS - 1) + "…";
  }
  return text;
}

interface TwitterApiError {
  title?: string;
  detail?: string;
  type?: string;
  status?: number;
  errors?: Array<{ message?: string; code?: number }>;
}

async function checkResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`Twitter API error HTTP ${res.status}: ${text}`);
    }
    return {};
  }
  if (!res.ok) {
    const err = json as TwitterApiError;
    const detail =
      err.detail ?? err.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Twitter [${err.title ?? res.status}]: ${detail}`);
  }
  return json;
}

// ─── adapter ───────────────────────────────────────────────────────────────────

export const twitterAdapter: PlatformAdapter = {
  async exchangeCode(code, redirectUri) {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    if (!clientId) {
      throw new Error(
        "TWITTER_CLIENT_ID no configurado. Configura las credenciales en .env.local.",
      );
    }

    // PKCE OAuth 2.0 — code_verifier should be stored in session; here we
    // rely on it being passed via redirectUri state or a separate env var.
    // For the dev flow the code_verifier is provided as TWITTER_CODE_VERIFIER env.
    const codeVerifier = process.env.TWITTER_CODE_VERIFIER ?? "challenge";

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    // Twitter requires Basic auth with client_id:client_secret when a secret exists
    const authHeader = clientSecret
      ? `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
      : undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (authHeader) headers["Authorization"] = authHeader;

    const tokenRes = await fetch(TWITTER_OAUTH, {
      method: "POST",
      headers,
      body: params.toString(),
    });
    const tokenData = (await checkResponse(tokenRes)) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    const accessToken = tokenData.access_token;

    // Get user info
    const userRes = await fetch(`${TWITTER_API}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = (await checkResponse(userRes)) as {
      data?: { id: string; name: string; username: string };
    };

    const user = userData.data;
    if (!user) {
      throw new Error("No se pudo obtener la informacion del usuario de Twitter.");
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : new Date(Date.now() + 2 * 60 * 60 * 1000); // Twitter v2 tokens expire in ~2h

    return {
      accessToken,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      accountInfo: {
        platformUserId: user.id,
        handle: user.username,
        displayName: user.name,
      },
    };
  },

  async refreshToken(refreshToken) {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    if (!clientId) {
      throw new Error("TWITTER_CLIENT_ID no configurado.");
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    });

    const authHeader = clientSecret
      ? `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
      : undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (authHeader) headers["Authorization"] = authHeader;

    const res = await fetch(TWITTER_OAUTH, {
      method: "POST",
      headers,
      body: params.toString(),
    });
    const data = (await checkResponse(res)) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : new Date(Date.now() + 2 * 60 * 60 * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  },

  async publish(account, variant, accessToken, _idempotencyKey): Promise<PublishResult> {
    const text = buildTweetText(variant);

    // If there is a mediaUrl but no v1.1 media upload, append it as a link
    // so the content is not lost. Full media upload requires OAuth 1.0a.
    let tweetText = text;
    if (variant.mediaUrl && !tweetText.includes(variant.mediaUrl)) {
      const withUrl = `${tweetText}\n${variant.mediaUrl}`;
      tweetText =
        withUrl.length <= MAX_TWEET_CHARS
          ? withUrl
          : tweetText.slice(0, MAX_TWEET_CHARS - variant.mediaUrl.length - 2) +
            "\n" +
            variant.mediaUrl;
    }

    const tweetRes = await fetch(`${TWITTER_API}/tweets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text: tweetText }),
    });
    const tweetData = (await checkResponse(tweetRes)) as {
      data?: { id: string; text: string };
    };

    if (!tweetData.data?.id) {
      throw new Error("Twitter no devolvio el ID del tweet publicado.");
    }

    return { platformPostId: tweetData.data.id, publishedAt: new Date() };
  },

  async fetchMetrics(_account, variant, accessToken) {
    if (!variant.platformPostId) {
      throw new Error("No hay platformPostId guardado para esta variante.");
    }

    const res = await fetch(
      `${TWITTER_API}/tweets/${variant.platformPostId}?tweet.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const data = (await checkResponse(res)) as {
      data?: {
        public_metrics?: {
          impression_count?: number;
          like_count?: number;
          reply_count?: number;
          retweet_count?: number;
          quote_count?: number;
          bookmark_count?: number;
        };
      };
    };

    const m = data.data?.public_metrics ?? {};
    return {
      impressions: m.impression_count,
      likes: m.like_count,
      comments: m.reply_count,
      shares: (m.retweet_count ?? 0) + (m.quote_count ?? 0),
      saves: m.bookmark_count,
      raw: data,
    };
  },
};
