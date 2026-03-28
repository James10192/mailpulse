import { ImageResponse } from "next/og";

export const alt = "MailPulse — Plateforme email marketing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Orange glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Mail icon */}
        <div style={{ display: "flex", marginBottom: "24px" }}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              stroke="#f97316"
              strokeWidth="2"
              fill="none"
            />
            <path d="M4 6l8 5 8-5" stroke="#f97316" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Brand */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-3px",
            marginBottom: "12px",
            display: "flex",
          }}
        >
          Mail
          <span style={{ color: "#f97316" }}>Pulse</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "#a1a1aa",
            marginBottom: "32px",
            display: "flex",
          }}
        >
          Campagnes email qui convertissent
        </div>

        {/* Divider */}
        <div
          style={{
            width: "120px",
            height: "3px",
            background: "linear-gradient(90deg, transparent, #f97316, transparent)",
            borderRadius: "2px",
            marginBottom: "24px",
            display: "flex",
          }}
        />

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            fontSize: 18,
            color: "#71717a",
          }}
        >
          <span style={{ display: "flex" }}>Tracking</span>
          <span style={{ color: "#3f3f46", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>Analytics</span>
          <span style={{ color: "#3f3f46", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>Automations</span>
          <span style={{ color: "#3f3f46", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>Open Source</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
