// canvas-local adapter — renders real branded PNG designs using node-canvas
// (Cairo-backed). Zero network, zero Chromium. Used as a fallback when no
// Remotion project exists for the workspace.
//
// Supported formats:
//   app_demo / ui_demo        → phone mockup with brand UI
//   motion_graphic            → data-driven keyframe (big number + chart)
//   data_animation            → same as motion_graphic
//   ugc_video / ugc_testimonial → talking-head TikTok frame
//   image                     → defaults to motion_graphic layout
//
// The visual templates are intentionally hard-coded to QYRO's habit-tracker
// concept right now. Future iterations would parameterize them from the
// Brand Brain.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  hashPrompt,
  type GenerateRequest,
  type GenerateOutput,
  type GeneratorAdapter,
} from "./base.js";

const RATIO_BY_PLATFORM: Record<string, { w: number; h: number; ratio: string }> = {
  tiktok: { w: 1080, h: 1920, ratio: "9:16" },
  instagram_reel: { w: 1080, h: 1920, ratio: "9:16" },
  instagram_feed: { w: 1080, h: 1350, ratio: "4:5" },
  instagram_story: { w: 1080, h: 1920, ratio: "9:16" },
  facebook_reel: { w: 1080, h: 1920, ratio: "9:16" },
  facebook_feed: { w: 1080, h: 1080, ratio: "1:1" },
  youtube_short: { w: 1080, h: 1920, ratio: "9:16" },
  linkedin: { w: 1080, h: 1080, ratio: "1:1" },
  pinterest: { w: 1080, h: 1620, ratio: "2:3" },
  twitter_x: { w: 1920, h: 1080, ratio: "16:9" },
};

// Dynamic require: canvas may or may not be installed. If absent the adapter
// throws and the caller falls back to the stub.
async function loadCanvas(): Promise<typeof import("canvas")> {
  try {
    return await import("canvas");
  } catch {
    // Try the temp install path used during initial setup
    return await import("/tmp/studio-canvas/node_modules/canvas/index.js" as any);
  }
}

export const canvasLocalAdapter: GeneratorAdapter = {
  tool: "remotion", // appears as the same tool to the pipeline
  async isAvailable() {
    try {
      await loadCanvas();
      return true;
    } catch {
      return false;
    }
  },

  async generate(req: GenerateRequest): Promise<GenerateOutput> {
    const { createCanvas } = await loadCanvas();
    const dims = RATIO_BY_PLATFORM[req.platform] ?? RATIO_BY_PLATFORM.tiktok;
    await mkdir(req.outputDir, { recursive: true });
    const outPath = path.join(
      req.outputDir,
      `canvas-${req.brief.workspace}-${req.format}-${req.platform}-${Date.now()}.png`,
    );

    const primary = req.brief.brand.palette || "#7C5CFC";
    const hook = req.conceptHook || "";

    const canvas = createCanvas(dims.w, dims.h);
    const ctx = canvas.getContext("2d");

    if (req.format === "app_demo" || req.format === "ui_demo") {
      drawAppDemo(ctx, dims.w, dims.h, primary, hook);
    } else if (req.format === "ugc_video") {
      drawUGC(ctx, dims.w, dims.h, primary, hook);
    } else {
      drawMotionGraphic(ctx, dims.w, dims.h, primary, hook);
    }

    await writeFile(outPath, canvas.toBuffer("image/png"));

    return {
      mediaPath: outPath,
      ratio: dims.ratio,
      hasEarlyHook: true,
      hasBurnedSubtitles: req.format === "ugc_video",
      creditsSpent: 0,
      modelId: "canvas_local",
      promptHash: hashPrompt([req.brief.workspace, req.format, req.platform, hook]),
      toolNote: `node-canvas/Cairo render @ ${dims.w}x${dims.h}`,
    };
  },
};

// ─── Drawing primitives ────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [124, 92, 252];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function arc(ctx: any, cx: number, cy: number, r: number, a0: number, a1: number, color: string, lw: number) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.stroke(); ctx.restore();
}

// ─── App Demo ──────────────────────────────────────────────────────────────

function drawAppDemo(ctx: any, W: number, H: number, P: string, _hook: string) {
  const BG = "#F4F6FB", INK = "#1A1A2E", MUTED = "#A0A5B5", CARD = "#FFFFFF";
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

  ctx.font = "bold 42px sans-serif"; ctx.fillStyle = INK; ctx.fillText("9:41", 50, 80);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  roundRect(ctx, 920, 45, 100, 40, 8); ctx.stroke();
  ctx.fillStyle = INK; roundRect(ctx, 925, 50, 82, 30, 5); ctx.fill();
  ctx.fillRect(1020, 58, 8, 24);
  roundRect(ctx, 395, 30, 290, 58, 29); ctx.fill();

  ctx.font = "500 36px sans-serif"; ctx.fillStyle = P; ctx.fillText("VIERNES, 22 MAYO", 50, 178);
  ctx.font = "bold 76px sans-serif"; ctx.fillStyle = INK; ctx.fillText("Buenos días, Diego", 50, 270);
  ctx.font = "400 42px sans-serif"; ctx.fillStyle = MUTED; ctx.fillText("3 hábitos por completar hoy", 50, 330);

  const cx = 40, cy = 380, cw = W - 80, ch = 360;
  const grad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  grad.addColorStop(0, P); grad.addColorStop(1, "#5A3ED9");
  ctx.shadowColor = rgba(P, 0.35); ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = grad; roundRect(ctx, cx, cy, cw, ch, 48); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.font = "600 32px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.fillText("LIFE SCORE", 90, 445);
  ctx.font = "900 200px sans-serif"; ctx.fillStyle = "white"; ctx.fillText("87", 80, 650);
  ctx.font = "300 56px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillText("/ 100", 340, 620);
  ctx.font = "500 36px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("↑ +12 puntos esta semana", 90, 700);

  arc(ctx, 870, 560, 110, -Math.PI / 2, Math.PI * 1.5, "rgba(255,255,255,0.15)", 22);
  arc(ctx, 870, 560, 110, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.87, "rgba(255,255,255,0.95)", 22);
  ctx.font = "bold 52px sans-serif"; ctx.fillStyle = "white"; ctx.textAlign = "center";
  ctx.fillText("87%", 870, 580); ctx.textAlign = "left";

  ctx.font = "bold 52px sans-serif"; ctx.fillStyle = INK; ctx.fillText("Hábitos de hoy", 50, 820);

  const habits = [
    { name: "Meditación 10 min", sub: "Completado · 7:20 am", done: true, pct: 1, streak: "🔥 7 días" },
    { name: "Agua 2L al día", sub: "1.3L de 2L · 3 vasos más", done: false, pct: 0.67, streak: "" },
    { name: "Leer 20 páginas", sub: "Sin empezar · te queda tiempo", done: false, pct: 0, streak: "" },
  ];
  habits.forEach((h, i) => {
    const hy = 850 + i * 200;
    ctx.shadowColor = "rgba(0,0,0,0.08)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    ctx.fillStyle = CARD; roundRect(ctx, 40, hy, cw, 170, 36); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    const ix = 130, iy = hy + 85;
    if (h.done) {
      ctx.fillStyle = P; ctx.beginPath(); ctx.arc(ix, iy, 44, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(ix - 18, iy); ctx.lineTo(ix - 4, iy + 16); ctx.lineTo(ix + 20, iy - 16);
      ctx.stroke();
    } else {
      arc(ctx, ix, iy, 44, -Math.PI / 2, Math.PI * 1.5, "#E5E7F0", 6);
      if (h.pct > 0) {
        arc(ctx, ix, iy, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * h.pct, P, 6);
        ctx.font = "bold 26px sans-serif"; ctx.fillStyle = P; ctx.textAlign = "center";
        ctx.fillText(`${Math.round(h.pct * 100)}%`, ix, iy + 10); ctx.textAlign = "left";
      }
    }
    ctx.font = "bold 40px sans-serif"; ctx.fillStyle = INK; ctx.fillText(h.name, 200, hy + 72);
    ctx.font = "400 34px sans-serif"; ctx.fillStyle = MUTED; ctx.fillText(h.sub, 200, hy + 122);
    if (h.streak) {
      ctx.font = "500 32px sans-serif"; ctx.fillStyle = P; ctx.textAlign = "right";
      ctx.fillText(h.streak, cw + 20, hy + 100); ctx.textAlign = "left";
    }
    if (!h.done && h.pct > 0 && h.pct < 1) {
      roundRect(ctx, 640, hy + 115, 320, 22, 11); ctx.fillStyle = "#F0EDFF"; ctx.fill();
      roundRect(ctx, 640, hy + 115, 320 * h.pct, 22, 11); ctx.fillStyle = P; ctx.fill();
    }
  });

  const chartY = 1540;
  ctx.font = "bold 52px sans-serif"; ctx.fillStyle = INK; ctx.fillText("Esta semana", 50, chartY);
  ctx.shadowColor = "rgba(0,0,0,0.08)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = CARD; roundRect(ctx, 40, chartY + 20, cw, 300, 36); ctx.fill();
  ctx.shadowBlur = 0;

  const days = ["L","M","X","J","V","S","D"];
  const scores = [65,72,68,82,87,0,0];
  const barW = 80; const cMax = 180;
  const gap = (cw - 80 - days.length * barW) / (days.length - 1);
  days.forEach((d, i) => {
    const bx = 40 + 40 + i * (barW + gap);
    const sc = scores[i];
    const bh = sc > 0 ? (sc / 100) * cMax : 20;
    const by = chartY + 20 + 60 + (cMax - bh);
    if (i === 4) {
      const g2 = ctx.createLinearGradient(0, by, 0, by + bh);
      g2.addColorStop(0, P); g2.addColorStop(1, "#5A3ED9"); ctx.fillStyle = g2;
    } else if (sc === 0) {
      ctx.fillStyle = "#E5E7F0";
    } else {
      ctx.fillStyle = rgba(P, 0.3 + (sc / 100) * 0.4);
    }
    roundRect(ctx, bx, by, barW, bh, 12); ctx.fill();
    if (i === 4) {
      ctx.font = "bold 30px sans-serif"; ctx.fillStyle = P; ctx.textAlign = "center";
      ctx.fillText("87", bx + barW / 2, by - 12);
    }
    ctx.font = "400 30px sans-serif"; ctx.fillStyle = i === 4 ? P : MUTED;
    ctx.textAlign = "center"; ctx.fillText(d, bx + barW / 2, chartY + 305);
  });
  ctx.textAlign = "left";

  ctx.fillStyle = CARD; ctx.fillRect(0, H - 210, W, 210);
  ctx.strokeStyle = "#E5E7F0"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, H - 210); ctx.lineTo(W, H - 210); ctx.stroke();

  const nav = ["🏠|Inicio","✅|Hábitos","📊|Stats","👤|Perfil"];
  const navW = W / nav.length;
  nav.forEach((item, i) => {
    const [icon, label] = item.split("|");
    const nx = i * navW + navW / 2;
    if (i === 0) {
      ctx.fillStyle = "#F0EDFF"; roundRect(ctx, nx - 80, H - 200, 160, 140, 28); ctx.fill();
    }
    ctx.font = "48px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = INK;
    ctx.fillText(icon, nx, H - 135);
    ctx.font = `${i === 0 ? "bold" : "400"} 30px sans-serif`;
    ctx.fillStyle = i === 0 ? P : MUTED;
    ctx.fillText(label, nx, H - 80);
  });
  ctx.textAlign = "left";

  ctx.fillStyle = "rgba(26,26,46,0.2)"; roundRect(ctx, (W-260)/2, H-30, 260, 10, 5); ctx.fill();
  ctx.font = "bold 34px sans-serif"; ctx.fillStyle = rgba(P, 0.4); ctx.textAlign = "center";
  ctx.fillText("QYRO", W/2, H - 225); ctx.textAlign = "left";
}

// ─── Motion Graphic ────────────────────────────────────────────────────────

function drawMotionGraphic(ctx: any, W: number, H: number, P: string, hook: string) {
  const [PR, PG, PB] = hexToRgb(P);

  const bg = ctx.createLinearGradient(0, 0, W * 0.3, H);
  bg.addColorStop(0, "#0E0B1E"); bg.addColorStop(0.5, "#130F26"); bg.addColorStop(1, "#0A0815");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = `rgba(${PR},${PG},${PB},0.08)`; ctx.lineWidth = 1.5;
  [400,640,880,1120].forEach(y => { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); });
  [270,540,810].forEach(x => { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); });

  const glow = ctx.createRadialGradient(W/2, 780, 0, W/2, 780, 400);
  glow.addColorStop(0, `rgba(${PR},${PG},${PB},0.28)`); glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 380, W, 780);

  ctx.font = "800 120px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.textAlign = "center"; ctx.fillText("QYRO", W/2, 200);
  const u = ctx.createLinearGradient(W/2-220,0,W/2+220,0);
  u.addColorStop(0, `rgba(${PR},${PG},${PB},0)`); u.addColorStop(0.5, P); u.addColorStop(1, `rgba(${PR},${PG},${PB},0)`);
  ctx.fillStyle = u; ctx.fillRect(W/2-220, 220, 440, 4);

  ctx.font = "300 68px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(hook || "Mi Life Score subió", W/2, 340);

  roundRect(ctx, 280, 380, 520, 130, 65);
  const dg = ctx.createLinearGradient(0,380,W,510);
  dg.addColorStop(0, `rgba(${PR},${PG},${PB},0.15)`); dg.addColorStop(1, `rgba(${PR},${PG},${PB},0.28)`);
  ctx.fillStyle = dg; ctx.fill();
  ctx.strokeStyle = `rgba(${PR},${PG},${PB},0.4)`; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = "700 78px sans-serif";
  const sg = ctx.createLinearGradient(0,380,W,510); sg.addColorStop(0, P); sg.addColorStop(1, "#B48EFF");
  ctx.fillStyle = sg; ctx.fillText("+45 puntos", W/2, 464);

  ctx.font = "300 56px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("en 6 semanas", W/2, 570);

  ctx.shadowColor = P; ctx.shadowBlur = 60;
  const ng = ctx.createLinearGradient(W/2-250, 580, W/2+250, 820);
  ng.addColorStop(0, P); ng.addColorStop(1, "#B48EFF");
  ctx.font = "900 480px sans-serif"; ctx.fillStyle = ng; ctx.fillText("87", W/2, 880);
  ctx.shadowBlur = 0;
  ctx.font = "300 60px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillText("/ 100", W/2, 960);

  const bx = 80, by = 1020, bw = W - 160;
  roundRect(ctx, bx, by, bw, 22, 11); ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
  const fg = ctx.createLinearGradient(bx,0,bx+bw,0); fg.addColorStop(0, P); fg.addColorStop(1, "#9F80FF");
  roundRect(ctx, bx, by, bw*0.87, 22, 11); ctx.fillStyle = fg; ctx.fill();
  ctx.fillStyle = P; ctx.beginPath(); ctx.arc(bx+bw*0.87, by+11, 28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(bx+bw*0.87, by+11, 16, 0, Math.PI*2); ctx.fill();

  ctx.font = "400 36px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.textAlign = "left";
  ctx.fillText("Antes: 42", bx, 1090);
  ctx.fillStyle = "#9F80FF"; ctx.textAlign = "right"; ctx.fillText("Ahora: 87", bx + bw, 1090);

  const stats = [
    { l:"Hábitos", v:"3/3", s:"✓ completados" },
    { l:"Racha",   v:"🔥42", s:"días seguidos" },
    { l:"Semanas", v:"6",   s:"de constancia" },
  ];
  const scw = (W - 120 - 40) / 3;
  stats.forEach((st, i) => {
    const sx = 60 + i*(scw+20), sy = 1130;
    roundRect(ctx, sx, sy, scw, 220, 32);
    ctx.fillStyle = `rgba(${PR},${PG},${PB},0.12)`; ctx.fill();
    ctx.strokeStyle = `rgba(${PR},${PG},${PB},0.28)`; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "400 30px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "center"; ctx.fillText(st.l, sx + scw/2, sy + 52);
    ctx.font = "800 80px sans-serif"; ctx.fillStyle = "white"; ctx.fillText(st.v, sx + scw/2, sy + 152);
    ctx.font = "500 28px sans-serif"; ctx.fillStyle = P; ctx.fillText(st.s, sx + scw/2, sy + 200);
  });

  const pts: [number, number][] = [[80,1540],[230,1490],[380,1470],[530,1430],[680,1380],[830,1340],[1000,1280]];
  const ws = [42,51,58,68,74,81,87];
  ctx.strokeStyle = `rgba(${PR},${PG},${PB},0.3)`; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); pts.forEach(([x,y],i) => i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)); ctx.stroke();
  const lg = ctx.createLinearGradient(80,0,1000,0);
  lg.addColorStop(0, `rgba(${PR},${PG},${PB},0.6)`); lg.addColorStop(1, "#9F80FF");
  ctx.strokeStyle = lg; ctx.lineWidth = 5;
  ctx.beginPath(); pts.forEach(([x,y],i) => i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)); ctx.stroke();

  pts.forEach(([x,y],i) => {
    const last = i === pts.length-1;
    ctx.fillStyle = last ? "#9F80FF" : P;
    ctx.beginPath(); ctx.arc(x, y, last ? 18 : 12, 0, Math.PI*2); ctx.fill();
    if (last) { ctx.strokeStyle = "white"; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.font = last ? "bold 36px sans-serif" : "400 30px sans-serif";
    ctx.fillStyle = last ? "#9F80FF" : "rgba(255,255,255,0.3)";
    ctx.textAlign = "center"; ctx.fillText(String(ws[i]), x, y - 30);
    ctx.font = last ? "600 28px sans-serif" : "400 26px sans-serif";
    ctx.fillStyle = last ? P : "rgba(255,255,255,0.22)";
    ctx.fillText(last ? "HOY" : `S${i+1}`, x, 1640);
  });
  ctx.textAlign = "left";

  const ctaG = ctx.createLinearGradient(190,0,890,0); ctaG.addColorStop(0, P); ctaG.addColorStop(1, "#5A3ED9");
  roundRect(ctx, 190, 1690, 700, 130, 65); ctx.fillStyle = ctaG; ctx.fill();
  ctx.font = "700 52px sans-serif"; ctx.fillStyle = "white"; ctx.textAlign = "center";
  ctx.fillText("Descarga QYRO gratis", W/2, 1773);

  ctx.font = "400 36px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillText("@qyroapp · habit tracker con IA", W/2, 1870);
  ctx.textAlign = "left";
}

// ─── UGC ───────────────────────────────────────────────────────────────────

function drawUGC(ctx: any, W: number, H: number, P: string, hook: string) {
  const [PR, PG, PB] = hexToRgb(P);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1C1A2E"); bg.addColorStop(0.6, "#242236"); bg.addColorStop(1, "#0E0B1F");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ([[200,600,250,0.04],[900,400,180,0.05],[150,1300,270,0.03],[950,1100,210,0.04]] as [number,number,number,number][])
    .forEach(([x,y,r,o]) => {
      const g = ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0, `rgba(${PR},${PG},${PB},${o*3})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    });

  const bGlow = ctx.createRadialGradient(W/2, 900, 0, W/2, 900, 600);
  bGlow.addColorStop(0, `rgba(${PR},${PG},${PB},0.08)`); bGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bGlow; ctx.fillRect(0, 300, W, 900);

  ctx.fillStyle = "#2E2B45";
  ctx.beginPath(); ctx.ellipse(W/2, 1150, 580, 380, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3A3660";
  ctx.beginPath(); ctx.ellipse(W/2, 1050, 460, 230, 0, 0, Math.PI*2); ctx.fill();

  ctx.font = "800 54px sans-serif"; ctx.fillStyle = `rgba(${PR},${PG},${PB},0.2)`;
  ctx.textAlign = "center"; ctx.fillText("QYRO", W/2, 1070);

  ctx.fillStyle = "#4A4272"; roundRect(ctx, 470, 830, 140, 100, 16); ctx.fill();

  ctx.fillStyle = "#4A4272";
  ctx.beginPath(); ctx.ellipse(W/2, 640, 220, 240, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#2A2645";
  ctx.beginPath(); ctx.ellipse(W/2, 430, 220, 120, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#584E80";
  ctx.beginPath(); ctx.ellipse(W/2, 680, 180, 200, 0, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = "#3A3260";
  ctx.beginPath(); ctx.ellipse(W/2-68, 610, 26, 22, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W/2+68, 610, 26, 22, 0, 0, Math.PI*2); ctx.fill();

  ctx.strokeStyle = "#3A3260"; ctx.lineWidth = 10; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(W/2, 670, 60, 0.2, Math.PI - 0.2); ctx.stroke();

  const hg = ctx.createLinearGradient(0, 0, 0, 440);
  hg.addColorStop(0, "rgba(0,0,0,0.85)"); hg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 440);

  // Use provided hook or default
  const lines = (hook && hook.length > 0 ? hook : "POV: 5 apps y ninguna te dice si vas bien")
    .split(/[.,;]\s*/).slice(0, 3);

  ctx.font = "900 100px sans-serif"; ctx.fillStyle = "white"; ctx.textAlign = "left";
  ctx.fillText("POV:", 60, 130);
  ctx.font = "700 80px sans-serif";
  ctx.fillText(lines[0] || "5 apps y ninguna", 60, 230);
  if (lines[1]) ctx.fillText(lines[1].slice(0, 22), 60, 330);
  else ctx.fillText("te dice si vas bien", 60, 330);
  ctx.fillStyle = P; roundRect(ctx, 60, 244, 600, 12, 6); ctx.fill();

  const sgrad = ctx.createLinearGradient(0, 1200, 0, H);
  sgrad.addColorStop(0, "rgba(0,0,0,0)"); sgrad.addColorStop(0.15, "rgba(0,0,0,0.75)");
  sgrad.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = sgrad; ctx.fillRect(0, 1200, W, H - 1200);

  const subs = [
    { t: '"Tenía Notion, Todoist,', y: 1330, hi: false },
    { t: "Habitica, un cuaderno...", y: 1460, hi: false },
    { t: "y seguía sin saber si", y: 1590, hi: false },
    { t: 'realmente iba bien."', y: 1720, hi: true },
  ];
  subs.forEach(({ t, y, hi }) => {
    const bw2 = 1000, bx2 = (W - bw2) / 2;
    roundRect(ctx, bx2, y - 72, bw2, 110, 18);
    ctx.fillStyle = hi ? `rgba(${PR},${PG},${PB},0.3)` : "rgba(0,0,0,0.6)";
    ctx.fill();
    if (hi) { ctx.strokeStyle = `rgba(${PR},${PG},${PB},0.6)`; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.font = `${hi ? "800" : "700"} 60px sans-serif`; ctx.fillStyle = "white";
    ctx.textAlign = "center"; ctx.fillText(t, W/2, y);
  });

  const cg = ctx.createLinearGradient(190,0,890,0); cg.addColorStop(0, P); cg.addColorStop(1, "#5A3ED9");
  roundRect(ctx, 190, 1760, 700, 130, 65); ctx.fillStyle = cg; ctx.fill();
  ctx.font = "700 52px sans-serif"; ctx.fillStyle = "white"; ctx.textAlign = "center";
  ctx.fillText("Descarga QYRO", W/2, 1842);

  const acts: [string, string, number][] = [["❤️","24.8K",680],["💬","1.2K",810],["↗️","Share",940],["🔖","4.5K",1070]];
  acts.forEach(([i,l,y]) => {
    ctx.font = "56px sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = "white"; ctx.fillText(i, 990, y);
    ctx.font = "30px sans-serif"; ctx.fillText(l, 990 + 28, y + 48);
  });

  ctx.font = "bold 40px sans-serif"; ctx.fillStyle = "white"; ctx.textAlign = "left";
  ctx.fillText("@qyroapp", 50, 1240);
  ctx.font = "400 34px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("♪  Lo-fi beats to focus  ·  Original", 50, 1290);

  ctx.fillStyle = "rgba(255,255,255,0.18)"; roundRect(ctx, 0, H-58, W, 6, 3); ctx.fill();
  ctx.fillStyle = "white"; roundRect(ctx, 0, H-58, W*0.25, 6, 3); ctx.fill();
  ctx.beginPath(); ctx.arc(W*0.25, H-55, 14, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.35)"; roundRect(ctx, (W-320)/2, H-30, 320, 7, 3.5); ctx.fill();
}
