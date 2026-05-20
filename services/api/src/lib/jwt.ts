import { jwtVerify, SignJWT } from "jose";
import { config } from "../config.js";

/**
 * JWT con HS256 vía `jose`.
 *
 * Payload mínimo: { sub: userId, email, name }.
 * Expiración: 7 días. Se renueva en cada login.
 *
 * Se guarda en cookie httpOnly + Secure (en prod) + SameSite=Lax.
 * Cookie name: "pulse_session".
 */

export interface SessionPayload {
  sub: string; // user id
  email: string;
  name?: string;
}

const SECRET = new TextEncoder().encode(config.jwtSecret);
const EXPIRY = "7d";

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .setIssuer("pulse")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: "pulse" });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: payload.email as string,
      name: payload.name as string | undefined,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "pulse_session";
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;
