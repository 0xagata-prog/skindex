import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const canonicalOrigin = "https://codex-skindex.vercel.app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const title = "SkinDex — Codex 口袋皮肤图鉴";
  const description = "SkinDex 聚合 Dream Skin 等完整 Codex 皮肤与原生轻量配色；通过 $skindex 发现、创作、投稿，并逐步统一安全切换。";

  return {
    metadataBase: new URL(canonicalOrigin),
    title,
    description,
    alternates: { canonical: "/" },
    icons: { icon: "/favicon.png" },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalOrigin,
      images: [{ url: `${canonicalOrigin}/og-v2.png`, width: 1671, height: 941, alt: "SkinDex 完整皮肤聚合目录" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${canonicalOrigin}/og-v2.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
