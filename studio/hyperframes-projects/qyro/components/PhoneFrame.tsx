// PhoneFrame — wraps a child node in an iPhone-style frame with notch and
// rounded corners. Renders as a regular DOM element so it can be captured by
// Playwright frame-by-frame.

import * as React from "react";

interface Props {
  width?: number;
  children: React.ReactNode;
}

export function PhoneFrame({ width = 360, children }: Props) {
  const height = Math.round(width * (812 / 375));
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.13,
        background: "#0B1220",
        padding: width * 0.025,
        boxShadow: "0 30px 80px rgba(11,18,32,0.45)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: width * 0.11,
          background: "var(--brand-bg, #F4F6FB)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: width * 0.45,
            height: width * 0.06,
            background: "#0B1220",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            zIndex: 2,
          }}
        />
        {children}
      </div>
    </div>
  );
}
