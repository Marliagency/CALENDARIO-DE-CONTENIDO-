// Upload the 3 PNGs and push them as content pieces to QYRO.
const fs = require("fs");
const path = require("path");

const API = "http://localhost:3000";
const KEY = "sk_ws_a8f3c9d1_DEMO";
const RENDERS = path.resolve(__dirname, "../cache/renders/qyro");

async function uploadCreative(filePath) {
  const buf = fs.readFileSync(filePath);
  const name = path.basename(filePath);
  const boundary = "----pulse" + Date.now();
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\n` +
    `Content-Type: image/png\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, buf, tail]);

  const res = await fetch(`${API}/api/v1/ingest/creative-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });
  if (!res.ok) throw new Error(`upload failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function pushPiece({ externalRef, title, format, hook, platform, mediaUrl, caption }) {
  const body = {
    external_ref: externalRef,
    title,
    format,
    hook_used: hook,
    framework_used: "habit_tracker_v1",
    creative_run_metadata: {
      generator: "canvas_local",
      brand: "qyro",
      generated_at: new Date().toISOString(),
    },
    platform_variants: {
      [platform]: {
        media_url: mediaUrl,
        ratio: "9:16",
        caption,
        hashtags: ["#habittracker", "#productividad", "#qyro", "#lifescore"],
        cta_text: "Descarga QYRO gratis",
      },
    },
  };

  const res = await fetch(`${API}/api/v1/ingest/content-pieces`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ingest failed ${res.status}: ${await res.text()}`);
  return res.json();
}

(async () => {
  const pieces = [
    {
      file: "app-demo.png",
      externalRef: "qyro-app-demo-2026-05-22",
      title: "App demo: Life Score 87",
      format: "app_demo",
      hook: "Empieza el día con tu Life Score",
      platform: "instagram_feed",
      caption: "Tu día empieza en QYRO. Life Score, hábitos y racha en una sola pantalla. ✨",
    },
    {
      file: "motion-graphic.png",
      externalRef: "qyro-motion-graphic-2026-05-22",
      title: "Motion: Life Score 42→87 en 6 semanas",
      format: "motion_graphic",
      hook: "Mi Life Score subió +45 puntos en 6 semanas",
      platform: "tiktok",
      caption: "+45 puntos de Life Score en 6 semanas. Sin trucos. Solo constancia. 🔥 #habittracker",
    },
    {
      file: "ugc-testimonial.png",
      externalRef: "qyro-ugc-testimonial-2026-05-22",
      title: "UGC: 5 apps y ninguna te decía si vas bien",
      format: "ugc_video",
      hook: "POV: 5 apps y ninguna te dice si vas bien",
      platform: "tiktok",
      caption: "Tenía Notion, Todoist, Habitica, un cuaderno... y seguía sin saber si realmente iba bien. Ahora QYRO me lo dice de un vistazo. 💜",
    },
  ];

  for (const p of pieces) {
    process.stdout.write(`→ ${p.title}: `);
    try {
      const up = await uploadCreative(path.join(RENDERS, p.file));
      process.stdout.write(`uploaded (${up.size_bytes}B) → `);
      const piece = await pushPiece({ ...p, mediaUrl: up.url });
      console.log(`pushed ${piece.contentPieceId || piece.id || "ok"}`);
    } catch (e) {
      console.log(`FAIL: ${e.message}`);
    }
  }
})();
