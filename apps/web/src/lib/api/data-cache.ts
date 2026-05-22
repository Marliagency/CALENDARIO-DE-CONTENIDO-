/**
 * Cache global de datos cargados desde HTTP.
 *
 * En modo `VITE_MOCK_API=0`, la app prefetchea todos los datos del workspace
 * al iniciar sesión, los guarda aquí, y las funciones `sync.*` los leen.
 *
 * Mantiene el frontend funcional sin refactorizar 20 páginas individualmente.
 *
 * Las mutaciones (POST/PATCH/DELETE) deben invalidar partes relevantes y
 * llamar a `refetch*` para mantener consistencia.
 */

import type {
  AudiencePreset,
  BrandAsset,
  BrandBrain,
  BuyerPersona,
  Campaign,
  ContentPiece,
  Hook,
  PlatformVariant,
  SocialAccount,
  Workspace,
  WorkspaceApiKey,
} from "@pulse/types";
import type {
  AccountMetric,
  DailyMetric,
  FormatMetric,
} from "@pulse/mock-data";
import { http } from "./http";

interface DataCache {
  workspaces: Workspace[];
  pieces: ContentPiece[];
  variants: PlatformVariant[];
  accounts: SocialAccount[];
  brains: BrandBrain[];
  personas: BuyerPersona[];
  hooks: Hook[];
  assets: BrandAsset[];
  campaigns: Campaign[];
  audiences: AudiencePreset[];
  apiKeys: WorkspaceApiKey[];
  dailyMetrics: DailyMetric[];
  accountMetrics: AccountMetric[];
  formatMetrics: FormatMetric[];
  loaded: boolean;
  lastError: string | null;
  version: number;
}

const cache: DataCache = {
  workspaces: [],
  pieces: [],
  variants: [],
  accounts: [],
  brains: [],
  personas: [],
  hooks: [],
  assets: [],
  campaigns: [],
  audiences: [],
  apiKeys: [],
  dailyMetrics: [],
  accountMetrics: [],
  formatMetrics: [],
  loaded: false,
  lastError: null,
  version: 0,
};

const listeners = new Set<() => void>();

function notify() {
  cache.version++;
  for (const l of listeners) l();
}

export const dataCache = {
  get workspaces() { return cache.workspaces; },
  get pieces() { return cache.pieces; },
  get variants() { return cache.variants; },
  get accounts() { return cache.accounts; },
  get brains() { return cache.brains; },
  get personas() { return cache.personas; },
  get hooks() { return cache.hooks; },
  get assets() { return cache.assets; },
  get campaigns() { return cache.campaigns; },
  get audiences() { return cache.audiences; },
  get apiKeys() { return cache.apiKeys; },
  get dailyMetrics() { return cache.dailyMetrics; },
  get accountMetrics() { return cache.accountMetrics; },
  get formatMetrics() { return cache.formatMetrics; },
  get loaded() { return cache.loaded; },
  get lastError() { return cache.lastError; },
  get version() { return cache.version; },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  reset() {
    cache.workspaces = [];
    cache.pieces = [];
    cache.variants = [];
    cache.accounts = [];
    cache.brains = [];
    cache.personas = [];
    cache.hooks = [];
    cache.assets = [];
    cache.campaigns = [];
    cache.audiences = [];
    cache.apiKeys = [];
    cache.dailyMetrics = [];
    cache.accountMetrics = [];
    cache.formatMetrics = [];
    cache.loaded = false;
    cache.lastError = null;
    notify();
  },

  /**
   * Prefetchea todos los datos de los workspaces a los que pertenece el usuario.
   * Llamado tras login en modo HTTP.
   */
  async prefetchAll(workspaceSlugs: string[]) {
    cache.lastError = null;
    try {
      const wsList = (await http.listWorkspaces()) as Workspace[];
      cache.workspaces = wsList.filter((w) => workspaceSlugs.includes(w.slug));

      // Reset arrays acumulables
      cache.pieces = [];
      cache.variants = [];
      cache.accounts = [];
      cache.brains = [];
      cache.personas = [];
      cache.hooks = [];
      cache.assets = [];
      cache.campaigns = [];
      cache.audiences = [];
      cache.apiKeys = [];
      cache.dailyMetrics = [];
      cache.accountMetrics = [];
      cache.formatMetrics = [];

      for (const ws of cache.workspaces) {
        const [
          pieces,
          accounts,
          brain,
          personas,
          hooks,
          assets,
          campaigns,
          audiences,
          apiKeys,
          daily,
          byAccount,
          byFormat,
        ] = await Promise.all([
          http.getPieces(ws.slug) as Promise<ContentPiece[]>,
          http.getAccounts(ws.slug) as Promise<SocialAccount[]>,
          http.getBrain(ws.slug) as Promise<BrandBrain | null>,
          http.getPersonas(ws.slug) as Promise<BuyerPersona[]>,
          http.getHooks(ws.slug) as Promise<Hook[]>,
          http.getAssets(ws.slug) as Promise<BrandAsset[]>,
          http.getCampaigns(ws.slug) as Promise<Campaign[]>,
          http.getAudiences(ws.slug) as Promise<AudiencePreset[]>,
          http.getApiKeys(ws.slug) as Promise<WorkspaceApiKey[]>,
          http.getDailyMetrics(ws.slug, 7) as Promise<DailyMetric[]>,
          http.getAccountMetrics(ws.slug) as Promise<AccountMetric[]>,
          http.getFormatMetrics(ws.slug) as Promise<FormatMetric[]>,
        ]);

        for (const p of pieces) {
          cache.pieces.push(p);
          const v = (p as ContentPiece & { variants?: PlatformVariant[] }).variants;
          if (v) cache.variants.push(...v);
        }
        cache.accounts.push(...accounts);
        if (brain) cache.brains.push(brain);
        cache.personas.push(...personas);
        cache.hooks.push(...hooks);
        cache.assets.push(...assets);
        cache.campaigns.push(...campaigns);
        cache.audiences.push(...audiences);
        cache.apiKeys.push(...apiKeys);
        cache.dailyMetrics.push(...daily);
        cache.accountMetrics.push(...byAccount);
        cache.formatMetrics.push(...byFormat);
      }

      cache.loaded = true;
      notify();
    } catch (e) {
      cache.lastError = e instanceof Error ? e.message : String(e);
      cache.loaded = true; // marcamos loaded para que la app no se quede en spinner
      notify();
      throw e;
    }
  },

  // Mutaciones locales — invalidan parte de la cache.
  setBrain(workspaceId: string, brain: BrandBrain) {
    cache.brains = [
      ...cache.brains.filter((b) => b.workspaceId !== workspaceId),
      brain,
    ];
    notify();
  },
  upsertPersona(persona: BuyerPersona) {
    cache.personas = [
      ...cache.personas.filter((p) => p.id !== persona.id),
      persona,
    ];
    notify();
  },
  addAsset(asset: BrandAsset) {
    cache.assets.push(asset);
    notify();
  },

  addPiece(piece: ContentPiece) {
    cache.pieces.push(piece);
    notify();
  },

  removePiece(id: string) {
    cache.pieces = cache.pieces.filter((p) => p.id !== id);
    notify();
  },

  addCampaign(campaign: Campaign) {
    cache.campaigns.push(campaign);
    notify();
  },

  removeCampaign(id: string) {
    cache.campaigns = cache.campaigns.filter((c) => c.id !== id);
    notify();
  },

  setCampaigns(workspaceId: string, campaigns: Campaign[]) {
    cache.campaigns = [
      ...cache.campaigns.filter((c) => c.workspaceId !== workspaceId),
      ...campaigns,
    ];
    notify();
  },

  async refetchAccounts(workspaceSlug: string) {
    const ws = cache.workspaces.find((w) => w.slug === workspaceSlug);
    if (!ws) return;
    const fresh = (await http.getAccounts(workspaceSlug)) as SocialAccount[];
    cache.accounts = [
      ...cache.accounts.filter((a) => a.workspaceId !== ws.id),
      ...fresh,
    ];
    notify();
  },

  async refetchPieces(workspaceSlug: string) {
    const ws = cache.workspaces.find((w) => w.slug === workspaceSlug);
    if (!ws) return;
    const fresh = (await http.getPieces(workspaceSlug)) as (ContentPiece & {
      variants?: PlatformVariant[];
    })[];
    cache.pieces = [
      ...cache.pieces.filter((p) => p.workspaceId !== ws.id),
      ...fresh.map(({ variants: _v, ...p }) => p as ContentPiece),
    ];
    cache.variants = [
      ...cache.variants.filter((v) => v.workspaceId !== ws.id),
      ...fresh.flatMap((p) => p.variants ?? []),
    ];
    notify();
  },
};

export type { DataCache };
