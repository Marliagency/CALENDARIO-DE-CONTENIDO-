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
  loaded: boolean;
  lastError: string | null;
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
  loaded: false,
  lastError: null,
};

const listeners = new Set<() => void>();

function notify() {
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
  get loaded() { return cache.loaded; },
  get lastError() { return cache.lastError; },

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
        ]);

        // Los endpoints de pieces incluyen `variants` embebidos. Los extraemos.
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
};

export type { DataCache };
