# Remotion projects

One subfolder per workspace. The studio renders MP4s here and then runs
`applyBranding` (FFmpeg overlay) before pushing to Pulse.

## Bootstrap a new workspace project

```bash
cd studio/remotion-projects
npx create-video@latest <workspace-slug>
cd <workspace-slug>
# Copy the BrandTheme.tsx template from any existing workspace and fill the
# palette + logo from the workspace's Brand Brain.
```

## Conventions

```
<workspace-slug>/
  src/
    Root.tsx                ← compositions registered here
    compositions/
      MetricAnimation.tsx
      BrandIntro.tsx
      AppDemo.tsx
      DataStory.tsx
      TypographyPost.tsx
    components/
      BrandTheme.tsx        ← palette + logo (env-driven)
      PhoneFrame.tsx
  public/
    logo.svg                ← cached copy of the workspace logo
```

## Render presets

The studio calls these with `npx remotion render`:

| Platform        | Width | Height | FPS |
|-----------------|-------|--------|-----|
| TikTok / Reels  | 1080  | 1920   | 30  |
| Instagram Feed  | 1080  | 1350   | 30  |
| Square Feed     | 1080  | 1080   | 30  |
| YouTube Short   | 1080  | 1920   | 30  |
