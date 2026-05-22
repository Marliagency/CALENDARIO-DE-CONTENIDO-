import type { Platform } from "../types.js";

// Platform-specific constraints used by the QC engine and caption builder.

export const RATIO_BY_PLATFORM: Record<Platform, string> = {
  tiktok: "9:16",
  instagram_reel: "9:16",
  instagram_feed: "4:5",
  instagram_story: "9:16",
  facebook_reel: "9:16",
  facebook_feed: "1:1",
  youtube_short: "9:16",
  linkedin: "1:1",
  pinterest: "2:3",
  twitter_x: "16:9",
};

export const CAPTION_LIMIT: Record<Platform, number> = {
  tiktok: 2200,
  instagram_reel: 2200,
  instagram_feed: 2200,
  instagram_story: 250,
  facebook_reel: 2200,
  facebook_feed: 63206,
  youtube_short: 5000,
  linkedin: 3000,
  pinterest: 500,
  twitter_x: 280,
};

export const HASHTAG_LIMIT: Record<Platform, number> = {
  tiktok: 5,
  instagram_reel: 8,
  instagram_feed: 8,
  instagram_story: 0,
  facebook_reel: 5,
  facebook_feed: 5,
  youtube_short: 8,
  linkedin: 5,
  pinterest: 8,
  twitter_x: 3,
};

// Duration windows (seconds). undefined min/max means "no constraint on that side".
export const DURATION_RANGE: Record<Platform, { min?: number; max?: number }> = {
  tiktok: { min: 5, max: 180 },
  instagram_reel: { min: 5, max: 90 },
  instagram_feed: { min: 3, max: 60 },
  instagram_story: { min: 3, max: 60 },
  facebook_reel: { min: 5, max: 90 },
  facebook_feed: { min: 3, max: 240 },
  youtube_short: { min: 5, max: 60 },
  linkedin: { min: 3, max: 600 },
  pinterest: { min: 4, max: 60 },
  twitter_x: { min: 1, max: 140 },
};
