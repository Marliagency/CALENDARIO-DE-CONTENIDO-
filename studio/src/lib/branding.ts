// Branding overlay — burns the workspace logo onto every rendered asset.
//
// Image path → uses `ffmpeg` (single frame). Video path → uses `ffmpeg` with
// an overlay filter. The user's Mac runs ffmpeg from a standalone binary
// (evermeet.cx) since Homebrew is broken on Mojave; the studio doesn't care
// where ffmpeg comes from as long as it's on PATH.
//
// Positions try to avoid native platform UI: TikTok/Reels burn into the right
// side, lifted ~250px off the bottom to clear the action bar; feed posts sit
// in the bottom-right with full opacity.

import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { request } from "undici";
import type { BrandBrain, Platform } from "../types.js";

export interface OverlayPosition {
  x: string;       // ffmpeg expression, e.g. "W-w-20"
  y: string;
  opacity: number; // 0..1
}

const POSITIONS: Record<Platform, OverlayPosition> = {
  tiktok: { x: "W-w-20", y: "H-h-250", opacity: 0.85 },
  instagram_reel: { x: "W-w-20", y: "H-h-250", opacity: 0.85 },
  instagram_story: { x: "W-w-20", y: "H-h-280", opacity: 0.85 },
  instagram_feed: { x: "W-w-20", y: "H-h-20", opacity: 0.9 },
  facebook_reel: { x: "W-w-20", y: "H-h-250", opacity: 0.85 },
  facebook_feed: { x: "W-w-20", y: "H-h-20", opacity: 0.9 },
  youtube_short: { x: "W-w-20", y: "H-h-250", opacity: 0.85 },
  linkedin: { x: "W-w-20", y: "H-h-20", opacity: 0.9 },
  pinterest: { x: "W-w-20", y: "H-h-20", opacity: 0.9 },
  twitter_x: { x: "W-w-20", y: "H-h-20", opacity: 0.9 },
};

async function ensureLogoCached(brain: BrandBrain): Promise<string | null> {
  const logo = brain.assets.find((a) => a.section === "logo");
  if (!logo) return null;
  const cacheDir = path.resolve("studio/cache/logos");
  await mkdir(cacheDir, { recursive: true });
  const dest = path.join(cacheDir, `${brain.slug}-${logo.id}.png`);
  try {
    await stat(dest);
    return dest;
  } catch {
    // not cached yet
  }
  const res = await request(logo.fileUrl);
  if (res.statusCode >= 400) return null;
  const buf = Buffer.from(await res.body.arrayBuffer());
  await writeFile(dest, buf);
  return dest;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

export async function applyBranding(
  assetPath: string,
  platform: Platform,
  brain: BrandBrain,
): Promise<string> {
  const logoPath = await ensureLogoCached(brain);
  if (!logoPath) {
    console.warn(`[branding] no logo for ${brain.slug} — skipping overlay`);
    return assetPath;
  }
  const pos = POSITIONS[platform] ?? POSITIONS.instagram_feed;
  const dir = path.dirname(assetPath);
  const base = path.basename(assetPath, path.extname(assetPath));
  const ext = path.extname(assetPath);
  const out = path.join(dir, `${base}.branded${ext}`);

  const isVideo = ext === ".mp4" || ext === ".mov" || ext === ".webm";
  const filter = isVideo
    ? `[1:v]format=rgba,colorchannelmixer=aa=${pos.opacity}[lg];[0:v][lg]overlay=${pos.x}:${pos.y}`
    : `[1:v]format=rgba,colorchannelmixer=aa=${pos.opacity}[lg];[0:v][lg]overlay=${pos.x}:${pos.y}`;

  const args = [
    "-y",
    "-i",
    assetPath,
    "-i",
    logoPath,
    "-filter_complex",
    filter,
    ...(isVideo ? ["-c:a", "copy"] : []),
    out,
  ];
  await runFfmpeg(args);
  return out;
}

export function _testablePositions() {
  return POSITIONS;
}
