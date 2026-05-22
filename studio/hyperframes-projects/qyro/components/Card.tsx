import * as React from "react";

interface Props {
  title: string;
  subtitle?: string;
  emphasis?: string;
}

export function Card({ title, subtitle, emphasis }: Props) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 2px 14px rgba(11,18,32,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(11,18,32,0.5)", fontWeight: 600 }}>
        {title}
      </div>
      {emphasis && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "var(--brand-primary, #7C5CFC)",
          }}
        >
          {emphasis}
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 14, color: "var(--brand-text, #0B1220)" }}>{subtitle}</div>
      )}
    </div>
  );
}
