// 15-second feature highlight — single feature, tight reveal + payoff.
import * as React from "react";
import { PhoneFrame } from "../components/PhoneFrame.js";
import { Card } from "../components/Card.js";

interface Props {
  frame: number;
  fps: number;
  feature?: string;
  emphasis?: string;
  subtitle?: string;
}

export default function FeatureHighlight({
  frame,
  fps,
  feature = "Life Score",
  emphasis = "87",
  subtitle = "Tu equilibrio del día, calculado por AI",
}: Props) {
  const t = frame / fps;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--brand-bg, #F4F6FB)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: 'system-ui,-apple-system,"SF Pro Text",sans-serif',
      }}
    >
      {t < 2 ? (
        <div style={{ fontSize: 48, fontWeight: 800, padding: "0 32px", textAlign: "center" }}>
          {feature}
        </div>
      ) : (
        <PhoneFrame width={360}>
          <div style={{ padding: 24, paddingTop: 60 }}>
            <Card title={feature} emphasis={emphasis} subtitle={subtitle} />
          </div>
        </PhoneFrame>
      )}
    </div>
  );
}
