import * as React from "react";

const TABS = ["Hoy", "Score", "Plan", "Tú"];

export function NavBar({ active = 0 }: { active?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(20px)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        borderTop: "1px solid rgba(11,18,32,0.06)",
      }}
    >
      {TABS.map((t, i) => (
        <span
          key={t}
          style={{
            fontSize: 13,
            fontWeight: i === active ? 700 : 500,
            color:
              i === active ? "var(--brand-primary, #7C5CFC)" : "rgba(11,18,32,0.5)",
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
