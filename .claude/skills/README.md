# Studio skills

Custom Claude Code skills that encapsulate the prompts and parameters used to
generate content for each workspace. The studio (`@pulse/studio`) drives the
pipeline; these skills are the per-workspace "presets" the chat picks up
when the user says e.g. *"Genera UGC testimonial para QYRO"*.

## Convention

```
.claude/skills/
  <slug>-<pattern>/SKILL.md
```

Where `<pattern>` is the creative recipe:

| Pattern        | Format                | Default tool   |
|----------------|----------------------|----------------|
| ugc-testimonial| `ugc_video` (15s)    | Higgsfield Seedance |
| lifestyle      | `lifestyle_ad`       | Higgsfield Veo 3.1 (premium) |
| app-demo       | `app_demo`            | Remotion or HyperFrames |
| hypermotion    | `motion_graphic`      | Remotion |

Add new patterns by creating a new directory. The skill name is the directory
name; Claude Code matches user phrasing against the skill description so
write descriptions in the language the user actually uses (Spanish here).
