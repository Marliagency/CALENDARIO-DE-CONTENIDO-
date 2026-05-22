// Status bar — always 9:41 per Apple convention.
import * as React from "react";

export function StatusBar() {
  return (
    <div
      style={{
        height: 44,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        fontFamily:
          'system-ui,-apple-system,"SF Pro Text",sans-serif',
        fontSize: 16,
        fontWeight: 600,
        color: "var(--brand-text, #0B1220)",
      }}
    >
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span>•••</span>
        <span>📶</span>
        <span>100%</span>
      </span>
    </div>
  );
}
