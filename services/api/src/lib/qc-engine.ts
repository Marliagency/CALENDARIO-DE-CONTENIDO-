/**
 * Motor de QC — valida una ContentPiece + sus PlatformVariants contra reglas
 * configurables y reglas implícitas por plataforma.
 *
 * Devuelve un array de QcResult: { rule, severity, passed, message }.
 *
 * En esta fase ejecuta reglas hardcodeadas + claims_forbidden del Brand Brain.
 * Las QCRule de BD se aplicarán cuando definamos el motor de reglas dinámicas.
 */

import type { ContentPiece, PlatformVariant } from "@prisma/client";
import { parseJSON } from "./json.js";
import { prisma } from "../db.js";

export interface QcResult {
  rule: string;
  severity: "error" | "warning";
  passed: boolean;
  message?: string;
}

// Límites de caption por plataforma (caracteres).
const CAPTION_LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  youtube: 5000,
  linkedin: 3000,
  pinterest: 500,
  twitter_x: 280,
};

// Hashtag limits.
const HASHTAG_LIMITS: Record<string, number> = {
  instagram: 30,
  tiktok: 100,
  facebook: 30,
  youtube: 15,
  linkedin: 5,
  pinterest: 20,
  twitter_x: 5,
};

// Duración máxima por formato (segundos).
const DURATION_LIMITS: Record<string, number> = {
  reel: 90,
  short: 60,
  ugc_video: 180,
  app_demo: 180,
  lifestyle_ad: 180,
};

// Ratios típicos por plataforma + formato.
const EXPECTED_RATIOS: Record<string, string[]> = {
  reel: ["9:16"],
  short: ["9:16"],
  ugc_video: ["9:16"],
  app_demo: ["9:16", "1:1"],
  carousel: ["1:1", "4:5"],
  image: ["1:1", "4:5", "9:16"],
};

export async function runQc(
  piece: ContentPiece,
  variants: PlatformVariant[],
): Promise<QcResult[]> {
  const results: QcResult[] = [];

  // 1. Reglas por variante
  for (const v of variants) {
    const label = `[${v.platform}]`;

    // Caption length
    const limit = CAPTION_LIMITS[v.platform];
    if (limit && v.caption) {
      const ok = v.caption.length <= limit;
      results.push({
        rule: `${label} caption_length`,
        severity: "warning",
        passed: ok,
        message: ok
          ? `${v.caption.length}/${limit}`
          : `${v.caption.length} > ${limit}`,
      });
    }

    // Hashtag count
    const hashtags = parseJSON<string[]>(v.hashtags, []);
    const hashLimit = HASHTAG_LIMITS[v.platform];
    if (hashLimit) {
      const ok = hashtags.length <= hashLimit;
      results.push({
        rule: `${label} hashtag_count`,
        severity: "warning",
        passed: ok,
        message: ok ? `${hashtags.length}/${hashLimit}` : `Exceeds ${hashLimit}`,
      });
    }

    // Duración
    const durLimit = DURATION_LIMITS[piece.format];
    if (durLimit && v.durationS) {
      const ok = v.durationS <= durLimit;
      results.push({
        rule: `${label} duration`,
        severity: "error",
        passed: ok,
        message: ok ? `${v.durationS}s OK` : `${v.durationS}s > ${durLimit}s`,
      });
    }

    // Ratio
    const expectedRatios = EXPECTED_RATIOS[piece.format];
    if (expectedRatios && v.ratio) {
      const ok = expectedRatios.includes(v.ratio);
      results.push({
        rule: `${label} aspect_ratio`,
        severity: "error",
        passed: ok,
        message: ok ? `${v.ratio} OK` : `${v.ratio} (expected ${expectedRatios.join(" o ")})`,
      });
    }

    // Media URL accesible (HEAD)
    if (v.mediaUrl && !v.mediaUrl.startsWith("data:")) {
      // Skipping real HEAD for now — sería opcional/lento. Marcar como warning info.
      results.push({
        rule: `${label} media_url_present`,
        severity: "warning",
        passed: true,
        message: "URL present (HEAD check skipped)",
      });
    }
  }

  // 2. Claims forbidden del Brand Brain
  const brain = await prisma.brandBrain.findUnique({
    where: { workspaceId: piece.workspaceId },
  });
  if (brain) {
    const forbidden = parseJSON<string[]>(brain.claimsForbidden, []);
    for (const claim of forbidden) {
      const matched = variants.some((v) =>
        v.caption?.toLowerCase().includes(claim.toLowerCase()),
      );
      if (matched) {
        results.push({
          rule: "claims_forbidden",
          severity: "error",
          passed: false,
          message: `Contiene claim prohibido: "${claim}"`,
        });
      }
    }
  }

  return results;
}
