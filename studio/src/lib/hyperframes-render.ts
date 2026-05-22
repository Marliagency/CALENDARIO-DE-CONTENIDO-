// HyperFrames renderer. Spawns a headless Chromium via Playwright, mounts a
// React template, captures one PNG per frame, and pipes them to FFmpeg to
// produce an MP4. Pure local execution, zero API cost.
//
// Requirements (the studio doctor reports if missing):
//   * playwright (installed in studio/node_modules)
//   * ffmpeg on PATH
//   * @vitejs/plugin-react + vite (for the dev server that serves the
//     template) — installed lazily on first render
//
// This file is deliberately self-contained so the rest of the studio can
// import it conditionally (only when the user actually runs hyperframes).
// If Playwright isn't installed the adapter falls back to the stub.

import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface RenderHyperFramesOpts {
  workspaceSlug: string;
  template: string;        // e.g. "app-demo-30s"
  platform: string;        // tiktok, instagram_feed, ...
  durationSec: number;
  outPath: string;         // absolute path to the .mp4 to write
  templateProps?: Record<string, unknown>;
}

interface PlatformConfig {
  width: number;
  height: number;
  ratio: string;
}

interface HyperframesConfig {
  fps: number;
  platforms: Record<string, PlatformConfig>;
  brand: Record<string, string>;
}

async function loadConfig(slug: string): Promise<HyperframesConfig> {
  const file = path.resolve("studio/hyperframes-projects", slug, "hyperframes.config.json");
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as HyperframesConfig;
}

function buildHtml(template: string, brandVars: Record<string, string>): string {
  // Mount the template as a static React app. The renderer evaluates which
  // frame is current via `?frame=N&fps=N` query and re-renders for each.
  // Brand vars become CSS custom properties on :root.
  const cssVars = Object.entries(brandVars)
    .map(([k, v]) => `--brand-${k.replace(/_/g, "-")}: ${v}`)
    .join(";");
  return `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<style>
  :root { ${cssVars} }
  html, body, #app { margin: 0; padding: 0; width: 100vw; height: 100vh; }
  body { background: var(--brand-background, #F4F6FB); }
</style>
</head><body>
<div id="app"></div>
<script type="module">
  const params = new URLSearchParams(location.search);
  const frame = Number(params.get("frame") ?? 0);
  const fps = Number(params.get("fps") ?? 30);
  const props = JSON.parse(decodeURIComponent(params.get("props") ?? "%7B%7D"));
  const React = (await import("https://esm.sh/react@18")).default;
  const ReactDOM = await import("https://esm.sh/react-dom@18/client");
  const mod = await import("./${template}.js");
  const Comp = mod.default;
  ReactDOM.createRoot(document.getElementById("app"))
    .render(React.createElement(Comp, { frame, fps, ...props }));
  window.__rendered = true;
</script>
</body></html>`;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${stderr.slice(-500)}`)),
    );
  });
}

export async function renderHyperFrames(opts: RenderHyperFramesOpts): Promise<void> {
  // Lazy import so the rest of the studio doesn't pull Playwright when it
  // isn't installed. Typed as `any` because the studio package doesn't
  // declare playwright as a dependency — it's expected to be added by the
  // user once they bootstrap the HyperFrames flow.
  let playwright: {
    chromium: {
      launch: () => Promise<{
        newContext: (opts: {
          viewport: { width: number; height: number };
          deviceScaleFactor: number;
        }) => Promise<{
          newPage: () => Promise<{
            goto: (url: string, opts: { waitUntil: string }) => Promise<unknown>;
            waitForFunction: (fn: string, opts: { timeout: number }) => Promise<unknown>;
            screenshot: (opts: { path: string; omitBackground: boolean }) => Promise<unknown>;
          }>;
        }>;
        close: () => Promise<void>;
      }>;
    };
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    playwright = (await import("playwright" as string)) as any;
  } catch {
    throw new Error(
      "Playwright not installed. Run `pnpm --filter @pulse/studio add playwright` first.",
    );
  }

  const config = await loadConfig(opts.workspaceSlug);
  const platform = config.platforms[opts.platform];
  if (!platform) {
    throw new Error(`Platform "${opts.platform}" not configured in hyperframes.config.json`);
  }
  const totalFrames = Math.round(opts.durationSec * config.fps);

  const projectRoot = path.resolve("studio/hyperframes-projects", opts.workspaceSlug);
  const framesDir = path.join(projectRoot, ".frames-tmp");
  await mkdir(framesDir, { recursive: true });

  // Write an index.html that imports the template. Served by file:// URL.
  const html = buildHtml(opts.template, config.brand);
  const indexPath = path.join(framesDir, "index.html");
  await writeFile(indexPath, html, "utf8");

  const browser = await playwright.chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: platform.width, height: platform.height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    const propsParam = encodeURIComponent(JSON.stringify(opts.templateProps ?? {}));
    for (let f = 0; f < totalFrames; f++) {
      await page.goto(
        `file://${indexPath}?frame=${f}&fps=${config.fps}&props=${propsParam}`,
        { waitUntil: "networkidle" },
      );
      await page.waitForFunction("window.__rendered === true", { timeout: 5000 });
      await page.screenshot({
        path: path.join(framesDir, `f${String(f).padStart(6, "0")}.png`),
        omitBackground: false,
      });
    }
  } finally {
    await browser.close();
  }

  // Encode frames → MP4
  await runFfmpeg([
    "-y",
    "-framerate",
    String(config.fps),
    "-i",
    path.join(framesDir, "f%06d.png"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    opts.outPath,
  ]);
}
