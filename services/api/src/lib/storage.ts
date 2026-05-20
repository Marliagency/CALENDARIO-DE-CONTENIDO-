import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Storage abstraction.
 *
 * En development guarda los assets en `./storage/` con un token corto en la URL
 * que actúa como "presigned" simulada (TTL 1h).
 *
 * En producción se sustituye por un adapter de Cloudflare R2 / S3 con
 * `getSignedUrl` real.
 */

const STORAGE_DIR = path.resolve(process.cwd(), "storage");
const URL_PREFIX = process.env.STORAGE_PUBLIC_URL ?? "http://localhost:3000/storage";

interface PutOptions {
  workspaceId: string;
  filename: string;
  contentType?: string;
  body: Buffer | Uint8Array;
}

export const storage = {
  async put({ workspaceId, filename, body }: PutOptions) {
    await fs.mkdir(path.join(STORAGE_DIR, workspaceId), { recursive: true });
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${workspaceId}/${Date.now()}_${safe}`;
    await fs.writeFile(path.join(STORAGE_DIR, key), body);
    return { key, url: `${URL_PREFIX}/${key}` };
  },

  /**
   * Devuelve una URL temporal firmada con HMAC + expiración.
   * En dev se valida en el handler del endpoint /storage/:key.
   */
  signedUrl(key: string, ttlSec = 3600): string {
    const expires = Math.floor(Date.now() / 1000) + ttlSec;
    const sig = crypto
      .createHash("sha256")
      .update(`${key}:${expires}:${process.env.JWT_SECRET ?? "dev"}`)
      .digest("hex")
      .slice(0, 16);
    return `${URL_PREFIX}/${key}?exp=${expires}&sig=${sig}`;
  },

  verifySigned(key: string, exp: string, sig: string): boolean {
    if (!exp || !sig) return false;
    const expNum = parseInt(exp, 10);
    if (Number.isNaN(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
    const expected = crypto
      .createHash("sha256")
      .update(`${key}:${exp}:${process.env.JWT_SECRET ?? "dev"}`)
      .digest("hex")
      .slice(0, 16);
    return expected === sig;
  },

  async read(key: string) {
    return fs.readFile(path.join(STORAGE_DIR, key));
  },
};
