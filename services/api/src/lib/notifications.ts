import { prisma } from "../db.js";

/**
 * Helpers para crear notificaciones in-app.
 *
 * Las notificaciones pueden ser:
 *  - Por workspace (todos los miembros las ven)
 *  - Por usuario específico (solo ese user las ve)
 *  - Globales del sistema (sin workspaceId ni userId)
 */

export type NotificationKind =
  | "piece_in_review"
  | "piece_approved"
  | "piece_rejected"
  | "publish_succeeded"
  | "publish_failed"
  | "token_expiring"
  | "rate_limit"
  | "boost_completed"
  | "info";

interface CreateInput {
  kind: NotificationKind;
  title: string;
  body?: string;
  severity?: "info" | "warning" | "error";
  workspaceId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  url?: string;
}

export async function createNotification(input: CreateInput) {
  return prisma.notification.create({
    data: {
      kind: input.kind,
      title: input.title,
      body: input.body,
      severity: input.severity ?? "info",
      workspaceId: input.workspaceId,
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      url: input.url,
    },
  });
}

/**
 * Notifica a todos los miembros del workspace.
 */
export async function notifyWorkspace(
  workspaceId: string,
  payload: Omit<CreateInput, "workspaceId" | "userId">,
) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  });
  if (members.length === 0) {
    return createNotification({ ...payload, workspaceId });
  }
  return Promise.all(
    members.map((m) =>
      createNotification({ ...payload, workspaceId, userId: m.userId }),
    ),
  );
}

/**
 * Disparadores específicos — para usar desde los handlers.
 */
export async function notifyPieceInReview(
  workspaceId: string,
  pieceId: string,
  title: string,
  workspaceSlug: string,
) {
  return notifyWorkspace(workspaceId, {
    kind: "piece_in_review",
    title: "Nueva pieza para revisar",
    body: title,
    entityType: "ContentPiece",
    entityId: pieceId,
    url: `/w/${workspaceSlug}/queue/review?piece=${pieceId}`,
  });
}

export async function notifyTokenExpiring(
  workspaceId: string,
  accountId: string,
  handle: string,
  workspaceSlug: string,
  daysLeft: number,
) {
  return notifyWorkspace(workspaceId, {
    kind: "token_expiring",
    severity: "warning",
    title: `Token de ${handle} caduca en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`,
    body: "Reconecta la cuenta antes de la fecha límite para no interrumpir las publicaciones.",
    entityType: "SocialAccount",
    entityId: accountId,
    url: `/w/${workspaceSlug}/settings/connections`,
  });
}

export async function notifyPublishFailed(
  workspaceId: string,
  variantId: string,
  pieceTitle: string,
  error: string,
  workspaceSlug: string,
) {
  return notifyWorkspace(workspaceId, {
    kind: "publish_failed",
    severity: "error",
    title: `Falló la publicación: ${pieceTitle}`,
    body: error.slice(0, 200),
    entityType: "PlatformVariant",
    entityId: variantId,
    url: `/w/${workspaceSlug}/queue`,
  });
}

export async function notifyRateLimit(
  workspaceId: string,
  accountId: string,
  handle: string,
  workspaceSlug: string,
  used: number,
  limit: number,
) {
  const pct = Math.round((used / limit) * 100);
  return notifyWorkspace(workspaceId, {
    kind: "rate_limit",
    severity: "warning",
    title: `Cuota de ${handle} al ${pct}%`,
    body: `${used}/${limit} posts hoy. Considera espaciar las publicaciones.`,
    entityType: "SocialAccount",
    entityId: accountId,
    url: `/w/${workspaceSlug}/settings/connections`,
  });
}
