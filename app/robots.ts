import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/review", "/api/review/"] }],
    sitemap: "https://codex-skindex.vercel.app/sitemap.xml",
    host: "https://codex-skindex.vercel.app",
  };
}
