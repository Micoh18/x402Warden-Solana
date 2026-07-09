import { ImageResponse } from "next/og";

export const alt = "x402warden - settlement firewall for autonomous AI payments";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#070A0E",
          color: "#F2F5F1",
          padding: 64,
          fontFamily: "sans-serif",
          border: "1px solid #263442",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 42,
              height: 42,
              border: "2px solid #7CFFB2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7CFFB2",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            x
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>x402warden</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              border: "1px solid rgba(124,255,178,0.24)",
              color: "#B7F7D0",
              padding: "8px 14px",
              fontSize: 20,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Buyer protection for x402
          </div>
          <div style={{ marginTop: 30, fontSize: 76, lineHeight: 0.98, fontWeight: 760 }}>
            Let AI agents pay without giving them a blank check.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, color: "#A9B3AD", fontSize: 24 }}>
          <span>Policy checks before payment</span>
          <span>Escrow during delivery</span>
          <span>Recovery after failure</span>
        </div>
      </div>
    ),
    size
  );
}
