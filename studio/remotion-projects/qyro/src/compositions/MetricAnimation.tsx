// Placeholder Remotion composition — replaced once `npx create-video@latest`
// scaffolds the real project in this folder. Kept here so the directory is
// committed and the file-layout convention is visible in code review.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandTheme } from "../components/BrandTheme.js";

interface Props {
  label: string;
  fromValue: number;
  toValue: number;
}

export function MetricAnimation({ label, fromValue, toValue }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 18 } });
  const value = interpolate(progress, [0, 1], [fromValue, toValue]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BrandTheme.background,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ color: BrandTheme.text, fontSize: 64, fontWeight: 600 }}>{label}</div>
      <div style={{ color: BrandTheme.primary, fontSize: 220, fontWeight: 800 }}>
        {Math.round(value)}
      </div>
    </AbsoluteFill>
  );
}
