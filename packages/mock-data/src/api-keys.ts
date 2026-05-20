import type { WorkspaceApiKey } from "@pulse/types";

export const apiKeys: WorkspaceApiKey[] = [
  {
    id: "key-1",
    workspaceId: "ws-qyro",
    name: "SESIÓN 2 — Studio creativo",
    keyPrefix: "sk_ws_a8f3c9d1",
    scopes: ["ingest", "read_brain"],
    lastUsedAt: "2026-05-20T08:30:00Z",
    createdAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "key-2",
    workspaceId: "ws-qyro",
    name: "Métricas dashboard externo",
    keyPrefix: "sk_ws_b2e4d8f1",
    scopes: ["read_metrics"],
    lastUsedAt: "2026-05-19T22:00:00Z",
    createdAt: "2026-04-15T10:00:00Z",
  },
];

export function apiKeysForWorkspace(workspaceId: string): WorkspaceApiKey[] {
  return apiKeys.filter((k) => k.workspaceId === workspaceId);
}
