import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MailPulse",
    short_name: "MailPulse",
    description: "Campagnes email et WhatsApp depuis un espace unique.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff5a1f",
    lang: "fr",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/brand/mailpulse-icon-light.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
