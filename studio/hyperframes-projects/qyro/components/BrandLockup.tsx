import * as React from "react";

interface Props {
  tagline?: string;
  logoSrc?: string;
}

export function BrandLockup({
  tagline = "Tu día, optimizado",
  logoSrc,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      {logoSrc ? (
        <img src={logoSrc} alt="" style={{ width: 96, height: 96 }} />
      ) : (
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 22,
            background: "var(--brand-primary, #7C5CFC)",
          }}
        />
      )}
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--brand-text, #0B1220)",
          letterSpacing: -0.5,
        }}
      >
        {tagline}
      </div>
    </div>
  );
}
