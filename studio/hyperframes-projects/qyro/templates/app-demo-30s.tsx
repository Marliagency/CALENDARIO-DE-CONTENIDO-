// 30-second app demo. Scenes are time-gated by `frame / fps`. The HyperFrames
// renderer captures one PNG per frame; the visible content is whatever the
// current frame's scene predicate returns true for.
//
// Convention: a top-level `<App frame={...} fps={...}/>` is what the renderer
// mounts. The renderer passes the current frame number; this template is a
// pure function of (frame, fps).

import * as React from "react";
import { PhoneFrame } from "../components/PhoneFrame.js";
import { StatusBar } from "../components/StatusBar.js";
import { NavBar } from "../components/NavBar.js";
import { Card } from "../components/Card.js";
import { BrandLockup } from "../components/BrandLockup.js";

interface SceneProps {
  frame: number;
  fps: number;
}

function HookFrame({ tagline }: { tagline: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--brand-bg, #F4F6FB)",
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: "var(--brand-text, #0B1220)",
          padding: "0 32px",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {tagline}
      </div>
    </div>
  );
}

function HomeScreen({ score }: { score: number }) {
  return (
    <>
      <StatusBar />
      <div style={{ padding: "16px 16px 80px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>Hoy</div>
        <Card title="Life Score" emphasis={String(Math.round(score))} subtitle="Tu equilibrio del día" />
        <Card title="3 prioridades" subtitle="Diseñar landing · Llamada con Ana · 30 min lectura" />
        <Card title="Estado" subtitle="Tranquilo · 2 bloques libres esta tarde" />
      </div>
      <NavBar active={0} />
    </>
  );
}

function PayoffScreen() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--brand-bg, #F4F6FB)",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 64 }}>✓</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 12 }}>Día completado</div>
      <div style={{ fontSize: 16, color: "rgba(11,18,32,0.6)", marginTop: 8 }}>
        Sin caos, sin culpa.
      </div>
    </div>
  );
}

export default function AppDemo30s({ frame, fps }: SceneProps) {
  const t = frame / fps; // seconds

  // Animate Life Score from 42 → 87 between t=8 and t=18
  const scoreT = Math.max(0, Math.min(1, (t - 8) / 10));
  const score = 42 + (87 - 42) * (1 - Math.pow(1 - scoreT, 3));

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
      {t < 3 ? (
        <HookFrame tagline="El día empieza en QYRO" />
      ) : t < 25 ? (
        <PhoneFrame width={360}>
          {t < 23 ? <HomeScreen score={score} /> : <PayoffScreen />}
        </PhoneFrame>
      ) : (
        <BrandLockup tagline="Tu día, optimizado" />
      )}
    </div>
  );
}
