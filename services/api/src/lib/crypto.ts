import crypto from "node:crypto";
import { config } from "../config.js";

/**
 * AES-256-GCM para cifrar tokens OAuth y otros secretos en BD.
 * Formato del ciphertext: base64(iv | tag | encrypted)
 *  - iv:    12 bytes
 *  - tag:   16 bytes
 *  - rest:  ciphertext
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer {
  const raw = config.encryptionKey;
  // Aceptamos base64 de 32 bytes o string de 32 chars literal.
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
      key = Buffer.from(raw, "utf8");
    }
  } catch {
    key = Buffer.from(raw, "utf8");
  }
  if (key.length < 32) {
    // Padding determinista — solo aceptable en dev.
    key = Buffer.concat([key, Buffer.alloc(32 - key.length, 0)]);
  } else if (key.length > 32) {
    key = key.subarray(0, 32);
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LEN);
  const tag = data.subarray(IV_LEN, IV_LEN + 16);
  const enc = data.subarray(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * HMAC-SHA256 para firmar webhooks salientes.
 * Devuelve hex.
 */
export function hmacSign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function hmacVerify(payload: string, secret: string, signature: string): boolean {
  const expected = hmacSign(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}
