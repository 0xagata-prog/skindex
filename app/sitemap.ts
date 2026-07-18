import type { MetadataRoute } from "next";

const origin = "https://codex-skindex.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-18T00:00:00Z");
  return ["", "/privacy", "/terms", "/support"].map((path) => ({
    url: `${origin}${path}`,
    lastModified,
    changeFrequency: path ? "monthly" as const : "weekly" as const,
    priority: path ? 0.5 : 1,
  }));
}
