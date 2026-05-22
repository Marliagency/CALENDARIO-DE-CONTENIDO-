# HyperFrames projects

Alternative to Remotion when you need pixel-perfect control over the UI
(complex gradients, glass morphism, custom fonts, exotic layouts). Pipeline:

```
HTML/CSS template  →  Playwright captures frames  →  FFmpeg encodes to MP4
```

Cost: 0 (everything runs locally).

## Layout per workspace

```
<slug>/
  components/
    PhoneFrame.tsx        ← outer frame (notch + bezels)
    StatusBar.tsx         ← top status bar (always 9:41)
    NavBar.tsx            ← bottom tab bar
    Card.tsx              ← stylised card matching the workspace
    BrandLockup.tsx       ← animated logo + tagline
  templates/
    app-demo-30s.tsx      ← 30 s walkthrough template
    feature-highlight.tsx ← 15 s spotlight on a single feature
  public/
    fonts/                ← optional custom fonts
    logo.svg              ← cached copy of the workspace logo
  hyperframes.config.json ← width, height, fps, brand variables
```

## Rendering

```bash
# From repo root
pnpm --filter @pulse/studio studio hyperframes-render \
  --slug qyro --template app-demo-30s --platform tiktok
```

The renderer:
1. Reads `hyperframes.config.json` for fps + dimensions.
2. Boots a headless Chromium via Playwright.
3. Loads the template with brand env vars injected.
4. Captures one PNG per frame.
5. Pipes them to FFmpeg → MP4 at the target ratio.

The output drops into `studio/renders/<slug>/hyperframes-*.mp4` ready for
branding overlay and push.

## Why both Remotion AND HyperFrames?

| Need                                | Pick        |
|-------------------------------------|-------------|
| Most motion graphics + data anims   | Remotion    |
| App demos with mock UI              | Either      |
| Glass morphism, complex gradients   | HyperFrames |
| Real CSS interactions / hover demos | HyperFrames |
| Spring physics, deterministic anim  | Remotion    |

The workspace's `content_profile.primary_formats` decides which one the
router picks first.
