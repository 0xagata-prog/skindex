import Link from "next/link";
import "./legal.css";

export function LegalShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="legal-shell">
      <header className="legal-topbar">
        <Link className="legal-brand" href="/"><span>S</span><strong>SkinDex</strong></Link>
        <Link href="/">返回主题目录 →</Link>
      </header>
      <article className="legal-card">
        <span className="legal-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <p className="legal-date">更新日期：2026 年 7 月 18 日</p>
        {children}
      </article>
      <nav className="legal-links" aria-label="网站政策">
        <Link href="/privacy">隐私说明</Link>
        <Link href="/terms">使用条款</Link>
        <Link href="/support">支持与反馈</Link>
      </nav>
    </main>
  );
}
