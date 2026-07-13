import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MailPulse",
    short_name: "MailPulse",
    description: "Campagnes email et WhatsApp depuis un espace unique.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f97316",
    lang: "fr",
    icons: [{ src: "/icon", sizes: "any", type: "image/png" }],
  };
}
