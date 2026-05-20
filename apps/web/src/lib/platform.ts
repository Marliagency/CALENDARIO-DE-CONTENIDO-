import type { ContentFormat, Platform } from "@pulse/types";

export const platformLabel: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  twitter_x: "X / Twitter",
};

export const platformShort: Record<Platform, string> = {
  instagram: "IG",
  facebook: "FB",
  tiktok: "TT",
  youtube: "YT",
  linkedin: "LI",
  pinterest: "PIN",
  twitter_x: "X",
};

export const platformColor: Record<Platform, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  tiktok: "#000000",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  twitter_x: "#000000",
};

export const formatEmoji: Record<ContentFormat, string> = {
  image: "📷",
  carousel: "🖼️",
  reel: "🎬",
  ugc_video: "🎥",
  app_demo: "📱",
  lifestyle_ad: "🌅",
  short: "📺",
  post: "📝",
};

export const formatLabel: Record<ContentFormat, string> = {
  image: "Imagen",
  carousel: "Carrusel",
  reel: "Reel",
  ugc_video: "UGC Vídeo",
  app_demo: "App Demo",
  lifestyle_ad: "Lifestyle Ad",
  short: "Short",
  post: "Post",
};

export const statusColor: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-400",
  in_review: "bg-amber-500/15 text-amber-400",
  changes_requested: "bg-orange-500/15 text-orange-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  scheduled: "bg-blue-500/15 text-blue-400",
  published: "bg-emerald-500/15 text-emerald-400",
  analyzed: "bg-violet-500/15 text-violet-400",
  rejected: "bg-red-500/15 text-red-400",
  failed: "bg-red-500/15 text-red-400",
  ingest_rejected: "bg-red-500/15 text-red-400",
};

export const statusLabel: Record<string, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  changes_requested: "Cambios pedidos",
  approved: "Aprobado",
  scheduled: "Programado",
  published: "Publicado",
  analyzed: "Analizado",
  rejected: "Rechazado",
  failed: "Falló",
  ingest_rejected: "Ingest rechazado",
};

export const accountStatusColor: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-400",
  needs_reauth: "bg-amber-500/15 text-amber-400",
  rate_limited: "bg-orange-500/15 text-orange-400",
  disconnected: "bg-red-500/15 text-red-400",
};

export const accountStatusLabel: Record<string, string> = {
  healthy: "Conectada",
  needs_reauth: "Reautenticar",
  rate_limited: "Rate limit",
  disconnected: "Desconectada",
};
