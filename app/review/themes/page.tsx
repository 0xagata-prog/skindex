import { count, desc, inArray, like, or, sql } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "../../../db";
import { themeRevisions, themes } from "../../../db/schema";
import { requireChatGPTUser, chatGPTSignOutPath } from "../../chatgpt-auth";
import { isConfiguredReviewer } from "../../../lib/reviewer-auth";
import { ensureThemeData } from "../../../lib/theme-seed";
import { snapshotTheme } from "../../../lib/theme-admin";
import { ThemeManager } from "./theme-manager";
import "../review.css";

export const dynamic = "force-dynamic";
const pageSize = 20;

export default async function ManagedThemesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireChatGPTUser("/review/themes");
  if (!isConfiguredReviewer(user)) {
    return <main className="review-denied"><div><h1>这个账号没有主题管理权限</h1><p>SkinDex 已上架主题目前只允许站点所有者账号修改。</p><a href={chatGPTSignOutPath("/review/themes")}>退出并重新登录</a></div></main>;
  }
  await ensureThemeData();
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 80).toLowerCase() ?? "";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pattern = `%${query}%`;
  const where = query ? or(
    like(sql`lower(${themes.name})`, pattern),
    like(sql`lower(${themes.author})`, pattern),
    like(sql`lower(${themes.sourceName})`, pattern),
    like(sql`lower(${themes.sourceRepo})`, pattern),
  ) : undefined;
  const [totalRow] = await getDb().select({ value: count() }).from(themes).where(where);
  const total = Number(totalRow?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const rows = await getDb().select().from(themes).where(where)
    .orderBy(desc(themes.updatedAt), desc(themes.name)).limit(pageSize).offset((page - 1) * pageSize);
  const ids = rows.map((theme) => theme.id);
  const revisionRows = ids.length ? await getDb().select().from(themeRevisions)
    .where(inArray(themeRevisions.themeId, ids))
    .orderBy(desc(themeRevisions.createdAt)).limit(pageSize * 10) : [];
  const revisionsByTheme = new Map<string, typeof revisionRows>();
  for (const revision of revisionRows) {
    const existing = revisionsByTheme.get(revision.themeId) ?? [];
    if (existing.length < 10) existing.push(revision);
    revisionsByTheme.set(revision.themeId, existing);
  }
  const pageHref = (target: number) => `/review/themes?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(target) })}`;

  return (
    <main className="review-shell">
      <header className="review-topbar">
        <Link className="review-brand" href="/"><span>S</span>SkinDex</Link>
        <nav><Link href="/review">投稿审核</Link><Link className="active" href="/review/themes">已上架主题</Link><span>{user.displayName}</span><a href={chatGPTSignOutPath("/")}>退出</a></nav>
      </header>
      <section className="review-hero managed-hero">
        <div><small>OWNER-ONLY CATALOG</small><h1>已上架主题管理</h1><p>修改会自动保存上一版本并记录操作账号。下架不会删除资料，恢复历史版本前也会再次保存当前状态。</p></div>
        <div className="review-count"><strong>{total}</strong><span>目录主题</span></div>
      </section>
      <form className="managed-search" action="/review/themes" method="get"><input name="q" defaultValue={query} placeholder="搜索主题、作者或来源仓库" maxLength={80} /><button type="submit">搜索</button>{query && <Link href="/review/themes">清除</Link>}</form>
      <section className="managed-theme-list">
        {rows.map((theme) => <ThemeManager key={theme.id} id={theme.id} theme={snapshotTheme(theme)} revisions={(revisionsByTheme.get(theme.id) ?? []).map((revision) => ({ id: revision.id, action: revision.action, editorEmail: revision.editorEmail, createdAt: revision.createdAt }))} />)}
      </section>
      {totalPages > 1 && <nav className="review-pagination" aria-label="主题管理分页"><Link aria-disabled={page === 1} href={pageHref(Math.max(1, page - 1))}>← 上一页</Link><span>第 {page} / {totalPages} 页</span><Link aria-disabled={page === totalPages} href={pageHref(Math.min(totalPages, page + 1))}>下一页 →</Link></nav>}
    </main>
  );
}
