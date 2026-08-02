import type { Metadata } from "next";
import { Space_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const siteUrl = new URL("https://mailpulse-two.vercel.app");
const siteTitle = "MailPulse | Campagnes email et WhatsApp";
const siteDescription =
  "Créez, planifiez et analysez vos campagnes email et WhatsApp depuis un espace de travail unique.";

const spaceMono = Space_Mono({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "MailPulse",
  title: {
    default: siteTitle,
    template: "%s | MailPulse",
  },
  description: siteDescription,
  keywords: [
    "email marketing",
    "campagnes email",
    "WhatsApp Business",
    "automatisation marketing",
    "CRM",
    "analyse de campagnes",
  ],
  authors: [{ name: "MailPulse" }],
  creator: "MailPulse",
  publisher: "MailPulse",
  category: "Marketing",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "MailPulse",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MailPulse, le signal vivant de vos communications",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${spaceMono.variable} ${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
