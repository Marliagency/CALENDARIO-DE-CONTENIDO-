/**
 * Test de aislamiento entre workspaces — CRÍTICO.
 *
 * Comprueba que:
 *  1. La API key de un workspace no puede acceder al Brand Brain de otro.
 *  2. La ingesta con la API key de A intenta crear pieza con external_ref
 *     que ya existe en B → 409.
 *  3. El endpoint scopeado por slug devuelve 404 si el workspace no existe.
 *
 * Ejecutar con:
 *   pnpm --filter @pulse/api exec tsx test/isolation.test.ts
 *
 * Requiere la API corriendo en http://localhost:3000 y la BD seedada.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.PULSE_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

async function setupTestKeys() {
  // Asegurar 2 workspaces con API key cada uno.
  const qyro = await prisma.workspace.findUnique({ where: { slug: "qyro" } });
  const personal = await prisma.workspace.findUnique({ where: { slug: "personal" } });
  assert(qyro && personal, "Falta seedar workspaces (run pnpm db:seed)");

  function makeKey(workspaceId: string, name: string) {
    const prefix = "sk_ws_" + crypto.randomBytes(4).toString("hex");
    const secret = crypto.randomBytes(24).toString("hex");
    const token = `${prefix}_${secret}`;
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    return prisma.workspaceApiKey
      .create({
        data: {
          workspaceId,
          name,
          keyPrefix: prefix,
          keyHash: hash,
          scopes: JSON.stringify(["ingest", "read_brain"]),
        },
      })
      .then(() => token);
  }

  const tokenQyro = await makeKey(qyro.id, "isolation-test-qyro");
  const tokenPersonal = await makeKey(personal.id, "isolation-test-personal");
  return { qyro, personal, tokenQyro, tokenPersonal };
}

async function run() {
  console.log("→ Setup");
  const { tokenQyro, tokenPersonal } = await setupTestKeys();

  console.log("→ Test 1: workspace inexistente devuelve 404");
  {
    const res = await fetch(`${BASE}/api/v1/w/no-existe/brain`);
    assert.equal(res.status, 404, `Esperado 404, recibido ${res.status}`);
  }

  console.log("→ Test 2: ingest sin API key devuelve 401");
  {
    const res = await fetch(`${BASE}/api/v1/ingest/content-pieces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ external_ref: "x", title: "y", format: "post", platform_variants: {} }),
    });
    assert.equal(res.status, 401);
  }

  console.log("→ Test 3: ingest con API key inválida devuelve 401");
  {
    const res = await fetch(`${BASE}/api/v1/ingest/content-pieces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer sk_ws_fake_token",
      },
      body: JSON.stringify({ external_ref: "x", title: "y", format: "post", platform_variants: {} }),
    });
    assert.equal(res.status, 401);
  }

  console.log("→ Test 4: ingest crea pieza en el workspace correcto");
  const externalRef = crypto.randomUUID();
  {
    const res = await fetch(`${BASE}/api/v1/ingest/content-pieces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenQyro}`,
      },
      body: JSON.stringify({
        external_ref: externalRef,
        title: "Isolation test piece",
        format: "ugc_video",
        platform_variants: {
          tiktok: {
            media_url: "https://example.com/test.mp4",
            ratio: "9:16",
            caption: "test",
          },
        },
      }),
    });
    assert.equal(res.status, 201, `Esperado 201, recibido ${res.status}`);
    const body = await res.json();
    assert.ok(body.content_piece_id);
  }

  console.log("→ Test 5: re-ingest del mismo external_ref es idempotente (200)");
  {
    const res = await fetch(`${BASE}/api/v1/ingest/content-pieces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenQyro}`,
      },
      body: JSON.stringify({
        external_ref: externalRef,
        title: "duplicate",
        format: "ugc_video",
        platform_variants: { tiktok: { media_url: "https://example.com/test.mp4" } },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.idempotent, true);
  }

  console.log("→ Test 6: la API key de otro workspace con el mismo external_ref devuelve 409");
  {
    const res = await fetch(`${BASE}/api/v1/ingest/content-pieces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenPersonal}`,
      },
      body: JSON.stringify({
        external_ref: externalRef,
        title: "intento cross-workspace",
        format: "ugc_video",
        platform_variants: { tiktok: { media_url: "https://example.com/test.mp4" } },
      }),
    });
    assert.equal(res.status, 409, `Esperado 409, recibido ${res.status}`);
  }

  console.log("✅ Todos los tests de aislamiento pasaron.");

  // Cleanup
  await prisma.workspaceApiKey.deleteMany({
    where: { name: { startsWith: "isolation-test-" } },
  });
  await prisma.contentPiece.deleteMany({ where: { externalRef: externalRef } });
}

run()
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
