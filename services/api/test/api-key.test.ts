/**
 * Tests unitarios de generación de API keys.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { generateApiKey } from "../src/lib/api-key-auth.ts";

describe("api-key-auth.generateApiKey", () => {
  it("genera token con formato sk_ws_<8hex>_<48hex>", () => {
    const { token, prefix } = generateApiKey();
    assert.match(token, /^sk_ws_[a-f0-9]{8}_[a-f0-9]{48}$/);
    assert.match(prefix, /^sk_ws_[a-f0-9]{8}$/);
    assert.ok(token.startsWith(prefix));
  });

  it("hash coincide con sha256(token)", () => {
    const { token, hash } = generateApiKey();
    const expected = crypto.createHash("sha256").update(token).digest("hex");
    assert.equal(hash, expected);
  });

  it("tokens son únicos en 100 generaciones", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const { token } = generateApiKey();
      assert.ok(!set.has(token), "Colisión inesperada");
      set.add(token);
    }
  });
});
