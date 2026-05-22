// Studio runtime configuration. Reads from process.env (loaded via dotenv-cli
// pointing at .env.studio at the repo root). Active workspace can be switched
// at runtime with setActiveWorkspace().

export interface StudioConfig {
  PULSE_API_BASE_URL: string;
  PULSE_WORKSPACE_SLUG: string;
  PULSE_API_KEY: string;

  HIGGSFIELD_MONTHLY_CREDIT_BUDGET: number;
  HIGGSFIELD_WARN_AT_PCT: number;
  HIGGSFIELD_BLOCK_PREMIUM_AT_PCT: number;

  GEMINI_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  PLETOR_API_KEY?: string;

  LOGS_DIR: string;
  PENDING_QUEUE_PATH: string;
  RENDERS_DIR: string;
}

let cached: StudioConfig | null = null;

function envNum(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function config(): StudioConfig {
  if (cached) return cached;
  const slug = process.env.PULSE_WORKSPACE_SLUG ?? "qyro";
  const perWorkspaceKey = process.env[`${slug.toUpperCase()}_PULSE_API_KEY`];
  cached = {
    PULSE_API_BASE_URL: process.env.PULSE_API_BASE_URL ?? "http://localhost:3000",
    PULSE_WORKSPACE_SLUG: slug,
    PULSE_API_KEY: perWorkspaceKey ?? process.env.PULSE_API_KEY ?? "",
    HIGGSFIELD_MONTHLY_CREDIT_BUDGET: envNum("HIGGSFIELD_MONTHLY_CREDIT_BUDGET", 500),
    HIGGSFIELD_WARN_AT_PCT: envNum("HIGGSFIELD_WARN_AT_PCT", 70),
    HIGGSFIELD_BLOCK_PREMIUM_AT_PCT: envNum("HIGGSFIELD_BLOCK_PREMIUM_AT_PCT", 90),
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    PLETOR_API_KEY: process.env.PLETOR_API_KEY,
    LOGS_DIR: process.env.STUDIO_LOGS_DIR ?? "studio/logs",
    PENDING_QUEUE_PATH: process.env.STUDIO_PENDING_PATH ?? "studio/pending-pushes.jsonl",
    RENDERS_DIR: process.env.STUDIO_RENDERS_DIR ?? "studio/renders",
  };
  return cached;
}

export function setActiveWorkspace(slug: string): StudioConfig {
  const perWorkspaceKey = process.env[`${slug.toUpperCase()}_PULSE_API_KEY`];
  if (!perWorkspaceKey) {
    throw new Error(
      `No API key for workspace "${slug}". Set ${slug.toUpperCase()}_PULSE_API_KEY in .env.studio`,
    );
  }
  cached = {
    ...config(),
    PULSE_WORKSPACE_SLUG: slug,
    PULSE_API_KEY: perWorkspaceKey,
  };
  return cached;
}

export function resetConfigForTests() {
  cached = null;
}
