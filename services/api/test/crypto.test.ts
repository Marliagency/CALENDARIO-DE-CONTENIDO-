/**
 * Tests unitarios de lib/crypto.ts — AES-256-GCM + HMAC.
 * Ejecutar con: pnpm --filter @pulse/api test:unit
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decrypt, encrypt, hmacSign, hmacVerify } from "../src/lib/crypto.ts";

describe("crypto.encrypt/decrypt (AES-256-GCM)", () => {
  it("round-trips ASCII", () => {
    const plain = "hello world";
    assert.equal(decrypt(encrypt(plain)), plain);
  });

  it("round-trips UTF-8 con emojis", () => {
    const plain = "ñ á é — 🚀 sk_ws_xxxxxxxx_token-with-symbols";
    assert.equal(decrypt(encrypt(plain)), plain);
  });

  it("produce ciphertexts distintos cada vez (IV random)", () => {
    const a = encrypt("same input");
    const b = encrypt("same input");
    assert.notEqual(a, b);
  });

  it("falla al descifrar ciphertext modificado (tag inválido)", () => {
    const ct = encrypt("payload");
    const buf = Buffer.from(ct, "base64");
    buf[buf.length - 1] ^= 0xff; // corrompe último byte
    const tampered = buf.toString("base64");
    assert.throws(() => decrypt(tampered));
  });

  it("ciphertext incluye iv (12B) + tag (16B) como prefijo", () => {
    const ct = encrypt("x");
    const buf = Buffer.from(ct, "base64");
    assert.ok(buf.length >= 12 + 16 + 1);
  });
});

describe("crypto.hmacSign/hmacVerify", () => {
  it("firma + verificación correcta", () => {
    const sig = hmacSign("payload", "secret");
    assert.ok(hmacVerify("payload", "secret", sig));
  });

  it("rechaza firma con payload modificado", () => {
    const sig = hmacSign("payload", "secret");
    assert.equal(hmacVerify("payloadX", "secret", sig), false);
  });

  it("rechaza firma con secret distinto", () => {
    const sig = hmacSign("payload", "secret");
    assert.equal(hmacVerify("payload", "wrong", sig), false);
  });

  it("verify devuelve false con signature mal formada (no hex)", () => {
    assert.equal(hmacVerify("payload", "secret", "not-hex"), false);
  });
});
