import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  publishVideo,
  publishImage,
  getUploadStatus,
  listProfiles,
  getProfileForWorkspace,
  mapPlatformName,
} from "../src/adapters/upload-post.ts";

// Stub global fetch para capturar las llamadas sin red.
type FetchCall = { url: string; init: RequestInit };
const calls: FetchCall[] = [];
let nextResponse: { status: number; body: unknown } = { status: 200, body: { id: "stub-id" } };

const realFetch = globalThis.fetch;
const realEnvKey = process.env.UPLOAD_POST_API_KEY;
const realEnvBase = process.env.UPLOAD_POST_API_BASE;

before(() => {
  process.env.UPLOAD_POST_API_KEY = "test-key-123";
  process.env.UPLOAD_POST_API_BASE = "https://api.test-upload-post.local";
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(nextResponse.body), {
      status: nextResponse.status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = realFetch;
  if (realEnvKey === undefined) delete process.env.UPLOAD_POST_API_KEY;
  else process.env.UPLOAD_POST_API_KEY = realEnvKey;
  if (realEnvBase === undefined) delete process.env.UPLOAD_POST_API_BASE;
  else process.env.UPLOAD_POST_API_BASE = realEnvBase;
});

beforeEach(() => {
  calls.length = 0;
  nextResponse = { status: 200, body: { id: "stub-id" } };
});

describe("upload-post adapter", () => {
  describe("mapPlatformName", () => {
    it("mapea variantes internas a nombres de Upload-Post", () => {
      assert.equal(mapPlatformName("instagram_reel"), "instagram");
      assert.equal(mapPlatformName("instagram_feed"), "instagram");
      assert.equal(mapPlatformName("facebook_feed"), "facebook");
      assert.equal(mapPlatformName("youtube_short"), "youtube");
      assert.equal(mapPlatformName("twitter_x"), "x");
      assert.equal(mapPlatformName("tiktok"), "tiktok");
    });

    it("devuelve null para plataformas desconocidas", () => {
      assert.equal(mapPlatformName("myspace"), null);
    });
  });

  describe("getProfileForWorkspace", () => {
    it("lee la env var con el slug en mayusculas y underscores", () => {
      process.env.UPLOAD_POST_PROFILE_QYRO = "qyro-main";
      process.env.UPLOAD_POST_PROFILE_MARLI_AGENCY = "marli-agency";
      assert.equal(getProfileForWorkspace("qyro"), "qyro-main");
      assert.equal(getProfileForWorkspace("marli-agency"), "marli-agency");
    });

    it("lanza con mensaje explicito si no esta configurada", () => {
      delete process.env.UPLOAD_POST_PROFILE_NOEXISTE;
      assert.throws(
        () => getProfileForWorkspace("noexiste"),
        /UPLOAD_POST_PROFILE_NOEXISTE/,
      );
    });
  });

  describe("publishVideo", () => {
    it("manda POST a /api/upload con auth ApiKey y payload completo", async () => {
      nextResponse = { status: 200, body: { id: "upl_abc" } };
      const result = await publishVideo({
        profile: "qyro-main",
        platforms: ["tiktok", "instagram"],
        videoUrl: "https://cdn.example.com/v.mp4",
        title: "Caption test",
        scheduledAt: "2026-12-31T10:00:00Z",
        tiktokIsAiGenerated: true,
      });

      assert.equal(result.success, true);
      assert.equal(result.uploadId, "upl_abc");
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://api.test-upload-post.local/api/upload");
      assert.equal(calls[0].init.method, "POST");
      const headers = calls[0].init.headers as Record<string, string>;
      assert.equal(headers.Authorization, "ApiKey test-key-123");

      const body = JSON.parse(calls[0].init.body as string);
      assert.equal(body.profile, "qyro-main");
      assert.deepEqual(body["platform[]"], ["tiktok", "instagram"]);
      assert.equal(body.url, "https://cdn.example.com/v.mp4");
      assert.equal(body.title, "Caption test");
      assert.equal(body.scheduled_at, "2026-12-31T10:00:00Z");
      assert.equal(body.tiktok_is_ai_generated, true);
    });

    it("devuelve error sin lanzar si la API responde 400", async () => {
      nextResponse = { status: 400, body: { error: "bad media" } };
      const result = await publishVideo({
        profile: "qyro-main",
        platforms: ["tiktok"],
        videoUrl: "https://cdn.example.com/v.mp4",
        title: "x",
      });
      assert.equal(result.success, false);
      assert.match(result.error ?? "", /400/);
    });
  });

  describe("publishImage", () => {
    it("manda POST a /api/upload_photos con array de imagenes", async () => {
      nextResponse = { status: 200, body: { id: "upl_img_1" } };
      const result = await publishImage({
        profile: "diego-personal",
        platforms: ["instagram"],
        imageUrls: ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
        title: "Carrusel",
      });

      assert.equal(result.success, true);
      assert.equal(result.uploadId, "upl_img_1");
      assert.equal(calls[0].url, "https://api.test-upload-post.local/api/upload_photos");
      const body = JSON.parse(calls[0].init.body as string);
      assert.deepEqual(body["image[]"], [
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/b.jpg",
      ]);
    });
  });

  describe("getUploadStatus", () => {
    it("hace GET a /api/upload/:id y devuelve el body", async () => {
      nextResponse = {
        status: 200,
        body: {
          uploadId: "upl_abc",
          status: "published",
          platforms: { tiktok: { status: "published", postId: "tt123" } },
        },
      };
      const status = await getUploadStatus("upl_abc");
      assert.equal(status.status, "published");
      assert.equal(status.platforms.tiktok?.postId, "tt123");
      assert.equal(calls[0].url, "https://api.test-upload-post.local/api/upload/upl_abc");
      assert.equal(calls[0].init.method, "GET");
    });
  });

  describe("listProfiles", () => {
    it("devuelve la lista de perfiles", async () => {
      nextResponse = {
        status: 200,
        body: {
          profiles: [
            { username: "qyro-main", social_accounts: { tiktok: "@qyro_app", instagram: null } },
          ],
        },
      };
      const profiles = await listProfiles();
      assert.equal(profiles.length, 1);
      assert.equal(profiles[0].username, "qyro-main");
      assert.equal(profiles[0].social_accounts.tiktok, "@qyro_app");
    });

    it("devuelve [] si la respuesta no trae profiles", async () => {
      nextResponse = { status: 200, body: {} };
      const profiles = await listProfiles();
      assert.deepEqual(profiles, []);
    });
  });
});
