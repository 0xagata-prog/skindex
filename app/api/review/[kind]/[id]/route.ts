import { and, eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../../db";
import { submissions, themeProposals } from "../../../../../db/schema";
import { getAuthorizedReviewer } from "../../../../../lib/reviewer-auth";
import { APPROVED_THEME_STATUS, PENDING_REVIEW_STATUS } from "../../../../../lib/review-policy";

type RouteContext = { params: Promise<{ kind: string; id: string }> };

function parsePalette(value: string) {
  try {
    const palette = JSON.parse(value);
    return Array.isArray(palette) ? palette.map(String) : [];
  } catch {
    return [];
  }
}

function inferredMode(surface: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(surface);
  if (!match) return "深色";
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return (red * 299 + green * 587 + blue * 114) / 1000 > 145 ? "浅色" : "深色";
}

export async function POST(request: Request, context: RouteContext) {
  const reviewer = await getAuthorizedReviewer();
  if (!reviewer) return Response.json({ error: "没有审核权限" }, { status: 403 });

  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) {
    return Response.json({ error: "跨站审核请求已拒绝" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "审核格式无效" }, { status: 415 });
  }

  const { kind, id } = await context.params;
  const payload = await request.json() as { action?: string };
  if (payload.action !== "approve" && payload.action !== "reject") {
    return Response.json({ error: "审核操作无效" }, { status: 400 });
  }

  if (kind === "submission") {
    const [submission] = await getDb().select().from(submissions)
      .where(and(eq(submissions.id, id), eq(submissions.status, PENDING_REVIEW_STATUS))).limit(1);
    if (!submission) return Response.json({ error: "投稿不存在或已经处理" }, { status: 409 });

    const nextStatus = payload.action === "approve" ? APPROVED_THEME_STATUS : "rejected";
    await getDb().update(submissions).set({ status: nextStatus })
      .where(and(eq(submissions.id, id), eq(submissions.status, PENDING_REVIEW_STATUS)));
    return Response.json({ review: { id, status: nextStatus, public: false, next: nextStatus === APPROVED_THEME_STATUS ? "curation-required" : "closed" } });
  }

  if (kind !== "proposal") return Response.json({ error: "投稿类型无效" }, { status: 404 });

  const [proposal] = await getDb().select().from(themeProposals)
    .where(and(eq(themeProposals.id, id), eq(themeProposals.status, PENDING_REVIEW_STATUS))).limit(1);
  if (!proposal) return Response.json({ error: "投稿不存在或已经处理" }, { status: 409 });

  if (payload.action === "reject") {
    await getDb().update(themeProposals).set({ status: "rejected" })
      .where(and(eq(themeProposals.id, id), eq(themeProposals.status, PENDING_REVIEW_STATUS)));
    return Response.json({ review: { id, status: "rejected", public: false, next: "closed" } });
  }

  const palette = parsePalette(proposal.palette);
  if (palette.length < 3) return Response.json({ error: "主题色板无效，不能发布" }, { status: 409 });
  const themeId = `community-${proposal.id}`;
  const requestOrigin = new URL(request.url).origin;
  const now = new Date().toISOString();
  const tags = JSON.stringify([proposal.sourceType === "reference-image" ? "参考图生成" : "用户生成", "社区投稿", "原生导入"]);
  const description = proposal.notes || "由 SkinDex 用户生成并经所有者审核通过的社区主题。";

  await getD1().batch([
    getD1().prepare(`INSERT INTO themes (
      id, name, author, author_url, platform, mode, description, tags, palette,
      preview_url, source_url, download_url, source_name, source_repo, stars,
      license, verified_version, featured, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        themeId,
        proposal.themeName,
        proposal.authorName,
        `${requestOrigin}/#creators`,
        proposal.platform,
        inferredMode(palette[0]),
        description,
        tags,
        JSON.stringify(palette),
        `${requestOrigin}/api/theme-proposals/${proposal.id}/preview`,
        `${requestOrigin}/#themes`,
        `${requestOrigin}/#themes`,
        "SkinDex Community",
        `skindex/community/${proposal.id}`,
        0,
        "用户投稿 · 权利归投稿者",
        "codex-theme-v1",
        0,
        APPROVED_THEME_STATUS,
        now,
      ),
    getD1().prepare("UPDATE theme_proposals SET status = ? WHERE id = ? AND status = ?")
      .bind(APPROVED_THEME_STATUS, proposal.id, PENDING_REVIEW_STATUS),
  ]);

  return Response.json({ review: { id, status: APPROVED_THEME_STATUS, public: true, themeId } });
}
