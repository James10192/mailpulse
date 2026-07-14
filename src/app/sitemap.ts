import type { MetadataRoute } from "next";

const siteUrl = "https://mailpulse-two.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/contact`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/docs`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/en/docs`, lastModified, changeFrequency: "weekly", priority: 0.7 },
  ];
}
