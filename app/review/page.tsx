/* eslint-disable @next/next/no-img-element -- pending R2 previews use authenticated dynamic routes */
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "../../db";
import { submissions, themeProposals } from "../../db/schema";
import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { isConfiguredReviewer } from "../../lib/reviewer-auth";
import { PENDING_REVIEW_STATUS } from "../../lib/review-policy";
import { ensureThemeData } from "../../lib/theme-seed";
import { ReviewActions } from "./review-actions";
import "./review.css";

export const dynamic = "force-dynamic";

function parsePalette(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 6) : [];
  } catch {
    return [];
  }
}

export default async function ReviewPage() {
  const user = await requireChatGPTUser("/review");
  if (!isConfiguredReviewer(user)) {
    return (
      <main className="review-denied">
        <div>
          <h1>这个账号没有审核权限</h1>
          <p>SkinDex 审核后台目前只允许站点所有者账号访问。你可以退出后换用被授权的 ChatGPT 账号。</p>
          <a href={chatGPTSignOutPath("/review")}>退出并重新登录</a>
        </div>
      </main>
    );
  }

  await ensureThemeData();
  const [repoSubmissions, generatedProposals] = await Promise.all([
    getDb().select().from(submissions).where(eq(submissions.status, PENDING_REVIEW_STATUS)).orderBy(desc(submissions.createdAt)).limit(101),
    getDb().select().from(themeProposals).where(eq(themeProposals.status, PENDING_REVIEW_STATUS)).orderBy(desc(themeProposals.createdAt)).limit(101),
  ]);
  const queueCapped = repoSubmissions.length > 100 || generatedProposals.length > 100;
  const visibleRepoSubmissions = repoSubmissions.slice(0, 100);
  const visibleGeneratedProposals = generatedProposals.slice(0, 100);
  const total = visibleRepoSubmissions.length + visibleGeneratedProposals.length;

  return (
    <main className="review-shell">
      <header className="review-topbar">
        <Link className="review-brand" href="/"><span>S</span>SkinDex</Link>
        <nav><Link className="active" href="/review">投稿审核</Link><Link href="/review/themes">已上架主题</Link><span>{user.displayName}</span><a href={chatGPTSignOutPath("/")}>退出</a></nav>
      </header>

      <section className="review-hero">
        <div><small>OWNER-ONLY REVIEW</small><h1>主题审核台</h1><p>这里只显示尚未处理的投稿。生成主题通过后立即进入公开目录；GitHub 仓库通过后进入编目阶段，不会在资料不完整时自动发布。</p></div>
        <div className="review-count"><strong>{total}</strong><span>待审核</span></div>
      </section>
      {queueCapped && <p className="review-empty">队列较长：当前仅显示每类最新 100 条，请先处理现有投稿。</p>}

      <section className="review-section">
        <div className="review-section-heading"><h2>生成主题</h2><p>通过后立即公开 · 预览仅审核账号可见</p></div>
        {visibleGeneratedProposals.length ? (
          <div className="review-grid">
            {visibleGeneratedProposals.map((proposal) => {
              const palette = parsePalette(proposal.palette);
              return (
                <article className="review-card" key={proposal.id}>
                  <div className="review-preview"><img src={`/api/review/proposals/${proposal.id}/preview`} alt={`${proposal.themeName} 审核预览`} /></div>
                  <div className="review-card-body">
                    <div className="review-meta"><span>{proposal.platform}</span><span>{proposal.sourceType}</span><span>{proposal.createdAt}</span></div>
                    <h3>{proposal.themeName}</h3><p className="author">by {proposal.authorName}</p>
                    <p className="notes">{proposal.notes || "投稿者没有补充说明。"}</p>
                    <div className="review-palette" aria-label="主题色板">{palette.map((color) => <span key={color} title={color} style={{ background: color }} />)}</div>
                    <ReviewActions kind="proposal" id={proposal.id} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className="review-empty">暂无生成主题等待审核。</div>}
      </section>

      <section className="review-section">
        <div className="review-section-heading"><h2>GitHub 仓库</h2><p>接受后进入人工编目 · 不自动公开</p></div>
        {visibleRepoSubmissions.length ? (
          <div className="review-grid">
            {visibleRepoSubmissions.map((submission) => (
              <article className="review-card" key={submission.id}>
                <div className="review-card-body">
                  <div className="review-meta"><span>{submission.platform}</span><span>{submission.createdAt}</span></div>
                  <h3>{submission.themeName}</h3><p className="author">by {submission.authorName}</p>
                  <p className="notes">{submission.notes || "投稿者没有补充说明。"}</p>
                  <dl><div><dt>仓库</dt><dd><a href={submission.repoUrl} target="_blank" rel="noreferrer">{submission.repoUrl}</a></dd></div><div><dt>审核编号</dt><dd>{submission.id}</dd></div></dl>
                  <ReviewActions kind="submission" id={submission.id} />
                </div>
              </article>
            ))}
          </div>
        ) : <div className="review-empty">暂无 GitHub 仓库等待审核。</div>}
      </section>
    </main>
  );
}
