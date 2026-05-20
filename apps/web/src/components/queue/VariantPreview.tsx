import { Heart, MessageCircle, Music2, Send, Smartphone } from "lucide-react";
import type { PlatformVariant } from "@pulse/types";
import { sync } from "@/lib/api/client";
import { platformLabel } from "@/lib/platform";

export function VariantPreview({ variant }: { variant: PlatformVariant }) {
  const acc = sync.allAccounts().find((a) => a.id === variant.socialAccountId);

  return (
    <div className="space-y-2">
      <div className="text-xs text-ink-muted">
        Preview — {platformLabel[variant.platform]} · {acc?.handle}
      </div>
      <div className="mx-auto w-full max-w-[280px]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border-4 border-zinc-800 bg-zinc-950 shadow-xl">
          {/* Notch */}
          <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-zinc-900" />

          {/* Media */}
          <div className="relative h-full w-full">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, var(--ws-primary) 0%, var(--ws-secondary) 100%)`,
                opacity: 0.5,
              }}
            />
            <div className="absolute inset-0 grid place-items-center text-white/80">
              <div className="text-center">
                <Smartphone className="mx-auto size-10 opacity-70" />
                <div className="mt-2 text-[10px] uppercase tracking-wider">
                  Vídeo {variant.ratio}
                </div>
                {variant.durationS && (
                  <div className="text-[10px] opacity-70">
                    {variant.durationS}s
                  </div>
                )}
              </div>
            </div>

            {/* Caption overlay */}
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
              <div className="text-[11px] font-semibold">{acc?.handle}</div>
              <div className="mt-1 text-[10px] leading-tight line-clamp-3">
                {variant.caption}
              </div>
              {variant.hashtags.length > 0 && (
                <div className="mt-1 text-[9px] text-white/70">
                  #{variant.hashtags.join(" #")}
                </div>
              )}
              {variant.musicRef && (
                <div className="mt-1 flex items-center gap-1 text-[9px] text-white/70">
                  <Music2 className="size-2.5" /> {variant.musicRef}
                </div>
              )}
            </div>

            {/* Right rail (TikTok / Reel style) */}
            <div className="absolute bottom-16 right-2 z-10 flex flex-col items-center gap-3 text-white">
              <Heart className="size-5" />
              <MessageCircle className="size-5" />
              <Send className="size-5" />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Caption</span>
          <span className="tabular-nums">
            {(variant.caption?.length ?? 0)} / 2200
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Hashtags</span>
          <span className="tabular-nums">{variant.hashtags.length}</span>
        </div>
        {variant.durationS && (
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Duración</span>
            <span className="tabular-nums">{variant.durationS}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
