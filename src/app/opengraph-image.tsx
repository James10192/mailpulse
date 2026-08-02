import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "MailPulse, le signal vivant de vos communications";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const capabilities = ["Email", "WhatsApp", "Automatisation", "Analyse"];

export default async function OGImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/mailpulse-mark-light.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "40px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" height={92} src={logoSrc} width={154} />
            <div
              style={{
                display: "flex",
                color: "#171717",
                fontSize: "30px",
                fontWeight: 600,
                letterSpacing: "-0.6px",
              }}
            >
              Mail<span style={{ color: "#ff5a1f" }}>Pulse</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: "760px",
              fontSize: "68px",
              lineHeight: 1.05,
              fontWeight: 700,
              color: "#171717",
            }}
          >
            Pilotez vos campagnes email et WhatsApp.
          </div>
          <div style={{ display: "flex", marginTop: "26px", fontSize: "28px", color: "#71717a" }}>
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
                border: "1px solid #e4e4e7",
                borderRadius: "999px",
                color: "#52525b",
                fontSize: "18px",
              }}
            >
              {capability}
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", color: "#ff5a1f", fontSize: "20px", fontWeight: 700 }}>
            MailPulse
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
