import { getDb } from "../../../db";
import { submissions } from "../../../db/schema";
import { ensureThemeData } from "../../../lib/theme-seed";

const allowedPlatforms = new Set(["桌面端", "CLI", "全平台"]);

function isGitHubRepoUrl(value: string) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    return url.protocol === "https:" && url.hostname === "github.com" && segments.length >= 2;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return Response.json({ error: "跨站投稿请求已拒绝" }, { status: 403 });
    }

    const payload = (await request.json()) as {
      themeName?: string;
      authorName?: string;
      repoUrl?: string;
      platform?: string;
      notes?: string;
      website?: string;
    };
    if (payload.website) return Response.json({ accepted: true }, { status: 202 });

    const themeName = payload.themeName?.trim() ?? "";
    const authorName = payload.authorName?.trim() ?? "";
    const repoUrl = payload.repoUrl?.trim().replace(/\/$/, "") ?? "";
    const platform = payload.platform?.trim() ?? "";
    const notes = payload.notes?.trim().slice(0, 500) ?? "";

    if (themeName.length < 2 || themeName.length > 80) {
      return Response.json({ error: "主题名称需为 2–80 个字符" }, { status: 400 });
    }
    if (authorName.length < 2 || authorName.length > 60) {
      return Response.json({ error: "作者名称需为 2–60 个字符" }, { status: 400 });
    }
    if (!isGitHubRepoUrl(repoUrl)) {
      return Response.json({ error: "请填写有效的 GitHub 仓库链接" }, { status: 400 });
    }
    if (!allowedPlatforms.has(platform)) {
      return Response.json({ error: "不支持的平台类型" }, { status: 400 });
    }

    await ensureThemeData();
    const id = crypto.randomUUID();
    await getDb().insert(submissions).values({ id, themeName, authorName, repoUrl, platform, notes });

    return Response.json({ submission: { id, status: "pending" } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "投稿失败";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return Response.json({ error: "这个仓库已经提交过了" }, { status: 409 });
    }
    return Response.json({ error: "投稿暂时无法保存，请稍后重试" }, { status: 500 });
  }
}
