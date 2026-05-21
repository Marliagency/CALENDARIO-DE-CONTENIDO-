---
name: social-media-post
description: Publish or schedule social media posts via Upload-Post. Use this skill when the user asks to post, schedule, or publish content to TikTok, Instagram, Facebook, YouTube, LinkedIn, X/Twitter, Threads, Pinterest, Reddit, or Bluesky. Supports videos, images and carousels with per-platform caption overrides.
---

# Social media post via Upload-Post

This skill publishes content to social networks through the Upload-Post API. One API key covers all platforms — no per-network OAuth or App Review.

## When to use

Trigger this skill on requests like:
- "Post this video to TikTok and Instagram for the QYRO workspace"
- "Schedule this image carousel for tomorrow 19:00 on diego-personal"
- "Publish to all accounts in the qyro-main profile"
- "Programa este vídeo para mañana a las 9:00 en el perfil de Marli Agency"

## Required environment

`.env.local` must define:
- `UPLOAD_POST_API_KEY` — single API key from app.upload-post.com
- `UPLOAD_POST_API_BASE` — default `https://api.upload-post.com`
- `UPLOAD_POST_PROFILE_<WORKSPACE_SLUG_UPPER>` — profile name per workspace, e.g. `UPLOAD_POST_PROFILE_QYRO=qyro-main`

## Connected Accounts

Fill this table once the user connects accounts at https://app.upload-post.com. Update it whenever profiles change.

| Platform  | Profile Name      | Account Handle           | Workspace      |
|-----------|-------------------|--------------------------|----------------|
| TikTok    | qyro-main         | (pendiente conectar)     | QYRO           |
| Instagram | qyro-main         | (pendiente conectar)     | QYRO           |
| Facebook  | qyro-main         | (pendiente conectar)     | QYRO           |
| TikTok    | diego-personal    | (pendiente conectar)     | Personal       |
| Instagram | diego-personal    | (pendiente conectar)     | Personal       |
| TikTok    | marli-agency      | (pendiente conectar)     | Marli Agency   |
| Instagram | marli-agency      | (pendiente conectar)     | Marli Agency   |

## How to publish (via Pulse API)

The recommended path is to call Pulse's content API so the post is tracked in the queue and audit log:

```bash
# 1) Create the content piece (status="approved" if you want immediate publish)
POST /api/v1/w/:slug/content/pieces
{ "title": "...", "format": "reel", "status": "approved" }

# 2) Create a variant per platform with mediaUrl + caption
POST /api/v1/w/:slug/content/pieces/:id/variants
{ "platform": "tiktok", "socialAccountId": "...", "caption": "...", "mediaUrl": "https://..." }

# 3) Schedule (or leave scheduledAt empty for immediate publish on next runner tick)
PATCH /api/v1/w/:slug/queue/variants/:variantId/schedule
{ "scheduledAt": "2026-05-22T09:00:00Z" }
```

The publish-handler will pick it up and call Upload-Post via `services/api/src/adapters/upload-post.ts`.

## How to publish directly (out-of-band, when Pulse isn't running)

Use these curl calls. Replace `$UPLOAD_POST_API_KEY` and `<profile>` with real values.

```bash
# Video to multiple platforms (immediate publish)
curl -X POST https://api.upload-post.com/api/upload \
  -H "Authorization: ApiKey $UPLOAD_POST_API_KEY" \
  -d "profile=qyro-main" \
  -d "platform[]=tiktok" \
  -d "platform[]=instagram" \
  -d "url=https://example.com/video.mp4" \
  -d "title=Caption text"

# Image carousel
curl -X POST https://api.upload-post.com/api/upload_photos \
  -H "Authorization: ApiKey $UPLOAD_POST_API_KEY" \
  -d "profile=qyro-main" \
  -d "platform[]=instagram" \
  -d "image[]=https://example.com/1.jpg" \
  -d "image[]=https://example.com/2.jpg" \
  -d "title=Caption"

# List connected profiles
curl -H "Authorization: ApiKey $UPLOAD_POST_API_KEY" \
  https://api.upload-post.com/api/uploadposts/users

# Check upload status (returns per-platform postId / postUrl when published)
curl -H "Authorization: ApiKey $UPLOAD_POST_API_KEY" \
  https://api.upload-post.com/api/upload/<UPLOAD_ID>
```

## Platforms supported

`tiktok`, `instagram`, `facebook`, `youtube`, `linkedin`, `x`, `threads`, `pinterest`, `reddit`, `bluesky`

## Per-platform caption overrides

Use these payload keys to override the default `title` per platform:
- `tiktok_title`, `instagram_title`, `facebook_title`, `youtube_title`, `linkedin_title`

## TikTok-specific options

- `tiktok_privacy`: `PUBLIC_TO_EVERYONE` | `MUTUAL_FOLLOW_FRIENDS` | `FOLLOWER_OF_CREATOR` | `SELF_ONLY`
- `tiktok_disable_comment`, `tiktok_disable_duet`, `tiktok_disable_stitch`: booleans
- `tiktok_is_ai_generated`: **set to true if the content was AI-generated** — required by TikTok policy

## Workflow this skill follows

1. Resolve which **profile** to use:
   - If the user mentions a workspace ("for QYRO"), read `UPLOAD_POST_PROFILE_<WORKSPACE>` from `.env.local`
   - If the user mentions a profile by name, use it directly
2. Resolve **platforms** from the user's request (defaults to all platforms in the profile if unspecified)
3. If the user provided a media file path, upload it to a public URL first (Pulse uploads endpoint or external host). Upload-Post requires a publicly-accessible URL.
4. Build the request body and call `POST /api/upload` (video) or `POST /api/upload_photos` (image/carousel)
5. Return the `upload_id` to the user and (optionally) poll `GET /api/upload/<id>` until status is `published` or `failed`

## Rules

- Never commit `UPLOAD_POST_API_KEY` to the repo
- For AI-generated TikTok content, always set `tiktok_is_ai_generated=true`
- If the workspace profile env var is missing, refuse and tell the user which key to add to `.env.local`
- Log errors with the `workspace_id` and `content_piece_id` context when calling from within Pulse
