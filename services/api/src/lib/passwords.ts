import crypto from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing con scrypt nativo de Node — sin dependencias adicionales.
 *
 * Formato del hash en BD: `scrypt$<N>$<r>$<p>$<saltHex>$<keyHex>`
 *
 * Parámetros: N=16384 (2^14), r=8, p=1 — recomendados por OWASP para
 * uso interactivo en 2024+. keyLen=64 bytes.
 *
 * Si en el futuro queremos endurecer, basta con subir N. El verificador
 * lee los parámetros embebidos en el hash, así que los hashes antiguos
 * siguen funcionando.
 */

const scrypt = promisify(crypto.scrypt) as (
  pw: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  opts?: crypto.ScryptOptions,
) => Promise<Buffer>;

const N = 16384;
const r = 8;
const p = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error("Password too short (min 8 chars)");
  }
  const salt = crypto.randomBytes(SALT_LEN);
  const key = await scrypt(password, salt, KEY_LEN, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const sN = parseInt(parts[1], 10);
  const sR = parseInt(parts[2], 10);
  const sP = parseInt(parts[3], 10);
  const salt = Buffer.from(parts[4], "hex");
  const key = Buffer.from(parts[5], "hex");
  const computed = await scrypt(password, salt, key.length, {
    N: sN,
    r: sR,
    p: sP,
    maxmem: 64 * 1024 * 1024,
  });
  try {
    return crypto.timingSafeEqual(computed, key);
  } catch {
    return false;
  }
}
