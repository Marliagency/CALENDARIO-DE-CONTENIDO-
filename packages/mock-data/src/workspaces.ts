import type { Workspace } from "@pulse/types";

export const workspaces: Workspace[] = [
  {
    id: "ws-qyro",
    slug: "qyro",
    name: "QYRO",
    description: "Sistema operativo personal — app móvil que centraliza vida, salud, hábitos y finanzas.",
    type: "brand",
    brandColorPrimary: "#3B82F6",
    brandColorSecondary: "#7C5CFC",
    brandLogoUrl: undefined,
    defaultTimezone: "Europe/Madrid",
    defaultLanguage: "es-ES",
    status: "active",
    sortOrder: 0,
    createdBy: "user-diego",
    createdAt: "2026-01-12T09:00:00Z",
    updatedAt: "2026-05-18T14:23:00Z",
  },
  {
    id: "ws-personal",
    slug: "personal",
    name: "Diego Personal",
    description: "Contenido personal de Diego — vida, viajes, reflexiones.",
    type: "personal",
    brandColorPrimary: "#64748B",
    brandColorSecondary: "#94A3B8",
    defaultTimezone: "Europe/Madrid",
    defaultLanguage: "es-ES",
    status: "active",
    sortOrder: 1,
    createdBy: "user-diego",
    createdAt: "2026-02-03T18:30:00Z",
    updatedAt: "2026-05-19T22:11:00Z",
  },
];

export function workspaceBySlug(slug: string): Workspace | undefined {
  return workspaces.find((w) => w.slug === slug);
}
