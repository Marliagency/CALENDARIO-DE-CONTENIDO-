// Uploads a rendered creative file to Pulse via POST /ingest/creative-uploads
// and returns the URL Pulse will store. The studio embeds that URL into each
// platform variant's media_url before pushing the content piece.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { request, FormData, File } from "undici";
import { config } from "./config.js";
import { PulseApiError } from "./pulse-api.js";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
};

export interface UploadResult {
  url: string;
  key: string;
  sizeBytes: number;
}

export async function uploadCreative(localPath: string, apiKey?: string): Promise<UploadResult> {
  const key = apiKey ?? config().PULSE_API_KEY;
  if (!key) {
    throw new PulseApiError("PULSE_API_KEY not configured", 0, null);
  }
  const buf = await readFile(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";

  const form = new FormData();
  form.set("file", new File([buf], path.basename(localPath), { type: mime }));

  const res = await request(`${config().PULSE_API_BASE_URL}/api/v1/ingest/creative-uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const text = await res.body.text();
  if (res.statusCode >= 400) {
    throw new PulseApiError(`creative-uploads → ${res.statusCode}`, res.statusCode, text);
  }
  const data = JSON.parse(text) as { url: string; key: string; size_bytes: number };
  return { url: data.url, key: data.key, sizeBytes: data.size_bytes };
}
