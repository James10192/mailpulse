import { ImageResponse } from "next/og";

export const alt = "MailPulse, campagnes email et WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const capabilities = ["Email", "WhatsApp", "Automatisation", "Analyse"];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#18181b",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "40px" }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M4 6l8 5 8-5" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div
              style={{
                display: "flex",
                color: "#fafafa",
                fontSize: "30px",
                fontWeight: 600,
                letterSpacing: "-0.6px",
              }}
            >
              Mail<span style={{ color: "#f97316" }}>Pulse</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: "760px",
              fontSize: "68px",
              lineHeight: 1.05,
              fontWeight: 700,
              color: "#fafafa",
            }}
          >
            Pilotez vos campagnes email et WhatsApp.
          </div>
          <div style={{ display: "flex", marginTop: "26px", fontSize: "28px", color: "#a1a1aa" }}>
            Création, envoi, suivi et automatisation depuis un seul espace.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {capabilities.map((capability) => (
            <div
              key={capability}
              style={{
                display: "flex",
                padding: "10px 16px",
                border: "1px solid #3f3f46",
                borderRadius: "999px",
                color: "#d4d4d8",
                fontSize: "18px",
              }}
            >
              {capability}
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", color: "#f97316", fontSize: "20px", fontWeight: 700 }}>
            MailPulse
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
