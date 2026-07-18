import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { themeRevisions, themes } from "../../../../../db/schema";
import { ensureThemeData } from "../../../../../lib/theme-seed";
import { parseThemeAdminPayload, snapshotTheme } from "../../../../../lib/theme-admin";
import { updateThemeWithRevision } from "../../../../../lib/theme-admin-store";
import { getAuthorizedReviewer } from "../../../../../lib/reviewer-auth";

type RouteContext = { params: Promise<{ id: string }> };

async function readJson(request: Request) {
  try {
    return { ok: true as const, value: await request.json() as unknown };
  } catch {
    return { ok: false as const };
  }
}

async function authorize(request: Request) {
  const reviewer = await getAuthorizedReviewer();
  if (!reviewer) return { error: Response.json({ error: "没有主题管理权限" }, { status: 403 }) };
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return { error: Response.json({ error: "跨站主题管理请求已拒绝" }, { status: 403 }) };
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { error: Response.json({ error: "主题管理格式无效" }, { status: 415 }) };
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 32 * 1024) return { error: Response.json({ error: "主题资料过大" }, { status: 413 }) };
  return { reviewer };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authorize(request);
  if ("error" in auth) return auth.error;
  await ensureThemeData();
  const { id } = await context.params;
  const [currentTheme] = await getDb().select().from(themes).where(eq(themes.id, id)).limit(1);
  if (!currentTheme) return Response.json({ error: "主题不存在" }, { status: 404 });

  const body = await readJson(request);
  if (!body.ok) return Response.json({ error: "主题资料不是有效的 JSON" }, { status: 400 });
  const parsed = parseThemeAdminPayload(body.value);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const result = await updateThemeWithRevision({
    themeId: id,
    current: snapshotTheme(currentTheme),
    next: parsed.value,
    editorEmail: auth.reviewer.email,
    action: parsed.value.status !== currentTheme.status
      ? parsed.value.status === "approved" ? "publish" : "unpublish"
      : "update",
  });
  return Response.json({ theme: { id, status: parsed.value.status, updatedAt: result.updatedAt }, revisionId: result.revisionId });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authorize(request);
  if ("error" in auth) return auth.error;
  await ensureThemeData();
  const { id } = await context.params;
  const body = await readJson(request);
  if (!body.ok || !body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    return Response.json({ error: "恢复请求不是有效的 JSON" }, { status: 400 });
  }
  const payload = body.value as { action?: string; revisionId?: string };
  if (payload.action !== "restore" || !payload.revisionId) {
    return Response.json({ error: "恢复请求无效" }, { status: 400 });
  }
  const [[currentTheme], [revision]] = await Promise.all([
    getDb().select().from(themes).where(eq(themes.id, id)).limit(1),
    getDb().select().from(themeRevisions)
      .where(and(eq(themeRevisions.id, payload.revisionId), eq(themeRevisions.themeId, id)))
      .orderBy(desc(themeRevisions.createdAt))
      .limit(1),
  ]);
  if (!currentTheme || !revision) return Response.json({ error: "主题或历史版本不存在" }, { status: 404 });

  let snapshot: unknown;
  try {
    snapshot = JSON.parse(revision.snapshot);
  } catch {
    return Response.json({ error: "历史版本数据损坏，无法恢复" }, { status: 409 });
  }
  const parsed = parseThemeAdminPayload(snapshot);
  if (!parsed.ok) return Response.json({ error: `历史版本不符合当前标准：${parsed.error}` }, { status: 409 });
  const result = await updateThemeWithRevision({
    themeId: id,
    current: snapshotTheme(currentTheme),
    next: parsed.value,
    editorEmail: auth.reviewer.email,
    action: `restore:${revision.id}`,
  });
  return Response.json({ theme: { id, status: parsed.value.status, updatedAt: result.updatedAt }, revisionId: result.revisionId });
}
