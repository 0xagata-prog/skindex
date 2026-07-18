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
  const description = "在 SkinDex 发现、收藏和安全导入真实 Codex 社区主题，也可以通过 $skindex Skill 生成并投稿自己的皮肤。";

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
      images: [{ url: `${canonicalOrigin}/og.png`, width: 1672, height: 941, alt: "SkinDex — Codex 口袋皮肤图鉴" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${canonicalOrigin}/og.png`],
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
