/**
 * Tests unitarios del motor de QC.
 *
 * No usa BD real — pasa piezas y variantes en memoria y verifica los
 * QcResult devueltos. La parte de claims_forbidden requiere BD, está
 * marcada como integration (skip aquí).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runQc } from "../src/lib/qc-engine.ts";

function makePiece(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    workspaceId: "ws-1",
    format: "reel",
    title: "test",
    qcResults: "[]",
    targetAccounts: "[]",
    status: "in_review",
    source: "manual",
    externalRef: null,
    buyerPersonaId: null,
    campaignId: null,
    frameworkUsed: null,
    hookUsed: null,
    conceptId: null,
    notes: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as any;
}

function makeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: "v1",
    contentPieceId: "p1",
    workspaceId: "ws-1",
    socialAccountId: "acc-1",
    platform: "instagram",
    mediaUrl: "https://example.com/video.mp4",
    mediaType: "video",
    ratio: "9:16",
    durationS: 30,
    caption: "test caption",
    hashtags: "[]",
    boostEnabled: false,
    boostBudgetEur: 0,
    boostPlatforms: "[]",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    thumbnailUrl: null,
    firstComment: null,
    musicRef: null,
    ctaText: null,
    ctaUrl: null,
    boostDurationDays: null,
    boostDailyBudgetEur: null,
    boostObjective: null,
    boostAudiencePresetId: null,
    scheduledAt: null,
    publishedAt: null,
    platformPostId: null,
    platformVideoId: null,
    ...overrides,
  } as any;
}

describe("qc-engine.runQc", () => {
  it("reel con duración 30s pasa duration check", async () => {
    const piece = makePiece({ format: "reel" });
    const variant = makeVariant({ durationS: 30 });
    const results = await runQc(piece, [variant]);
    const dur = results.find((r) => r.rule.includes("duration"));
    assert.ok(dur);
    assert.equal(dur.passed, true);
  });

  it("reel con duración 120s falla duration check", async () => {
    const piece = makePiece({ format: "reel" });
    const variant = makeVariant({ durationS: 120 });
    const results = await runQc(piece, [variant]);
    const dur = results.find((r) => r.rule.includes("duration"));
    assert.ok(dur);
    assert.equal(dur.passed, false);
    assert.equal(dur.severity, "error");
  });

  it("ratio 9:16 OK para reel", async () => {
    const piece = makePiece({ format: "reel" });
    const variant = makeVariant({ ratio: "9:16" });
    const results = await runQc(piece, [variant]);
    const r = results.find((r) => r.rule.includes("aspect_ratio"));
    assert.ok(r?.passed);
  });

  it("ratio 1:1 falla para reel", async () => {
    const piece = makePiece({ format: "reel" });
    const variant = makeVariant({ ratio: "1:1" });
    const results = await runQc(piece, [variant]);
    const r = results.find((r) => r.rule.includes("aspect_ratio"));
    assert.equal(r?.passed, false);
  });

  it("caption_length pasa cuando 49/2200 en IG", async () => {
    const variant = makeVariant({
      platform: "instagram",
      caption: "POV: tienes 5 apps y ninguna te dice si vas bien.",
    });
    const results = await runQc(makePiece(), [variant]);
    const r = results.find((r) => r.rule.includes("caption_length"));
    assert.ok(r?.passed);
  });

  it("caption_length falla con 300 chars en Twitter", async () => {
    const variant = makeVariant({
      platform: "twitter_x",
      caption: "x".repeat(300),
    });
    const results = await runQc(makePiece(), [variant]);
    const r = results.find((r) => r.rule.includes("caption_length"));
    assert.equal(r?.passed, false);
  });

  it("hashtag_count: 30 en IG pasa, 31 falla", async () => {
    const ok = makeVariant({
      platform: "instagram",
      hashtags: JSON.stringify(Array.from({ length: 30 }, (_, i) => `tag${i}`)),
    });
    const ko = makeVariant({
      platform: "instagram",
      hashtags: JSON.stringify(Array.from({ length: 31 }, (_, i) => `tag${i}`)),
    });
    const okR = await runQc(makePiece(), [ok]);
    const koR = await runQc(makePiece(), [ko]);
    assert.equal(okR.find((r) => r.rule.includes("hashtag_count"))?.passed, true);
    assert.equal(koR.find((r) => r.rule.includes("hashtag_count"))?.passed, false);
  });
});
