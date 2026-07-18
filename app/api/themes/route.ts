import { and, count, countDistinct, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { themes } from "../../../db/schema";
import { buildThemeManifest } from "../../../lib/theme-manifest";
import { getThemeInstallability } from "../../../lib/theme-capability";
import { getThemePagination } from "../../../lib/theme-pagination";
import { APPROVED_THEME_STATUS, isPublicThemeStatus } from "../../../lib/review-policy";
import { ensureThemeData } from "../../../lib/theme-seed";

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const allowedFilters = new Set(["全部", "桌面端", "CLI", "深色", "浅色", "双模式"]);

function serializeTheme(theme: typeof themes.$inferSelect) {
  return {
    ...theme,
    tags: parseList(theme.tags),
    palette: parseList(theme.palette),
    install: getThemeInstallability(theme),
  };
}

function catalogFilter(filter: string) {
  if (filter === "桌面端") return or(eq(themes.platform, "桌面端"), eq(themes.platform, "全平台"));
  if (filter === "CLI") return or(eq(themes.platform, "CLI"), eq(themes.platform, "全平台"));
  if (filter === "深色") return or(eq(themes.mode, "深色"), eq(themes.mode, "双模式"));
  if (filter === "浅色") return or(eq(themes.mode, "浅色"), eq(themes.mode, "双模式"));
  if (filter === "双模式") return eq(themes.mode, "双模式");
  return undefined;
}

export async function GET(request: Request) {
  try {
    await ensureThemeData();
    const url = new URL(request.url);
    const requestedId = url.searchParams.get("id");
    if (url.searchParams.get("format") === "manifest") {
      if (!requestedId) return Response.json({ error: "缺少主题 ID" }, { status: 400 });
      const [theme] = await getDb()
        .select()
        .from(themes)
        .where(eq(themes.id, requestedId))
        .limit(1);
      if (!theme || !isPublicThemeStatus(theme.status)) return Response.json({ error: "主题不存在" }, { status: 404 });
      if (!theme.verifiedVersion.includes("codex-theme-v1")) {
        return Response.json({ error: "这个主题暂不支持原生 Skill 导入" }, { status: 409 });
      }
      const manifest = buildThemeManifest({
        ...theme,
        palette: parseList(theme.palette),
      }, url.origin);
      return Response.json(manifest, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
    }

    const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const query = url.searchParams.get("q")?.trim().slice(0, 80).toLowerCase() ?? "";
    const requestedFilter = url.searchParams.get("filter") ?? "全部";
    const filter = allowedFilters.has(requestedFilter) ? requestedFilter : "全部";
    const queryPattern = `%${query}%`;
    const searchCondition = query
      ? or(
        like(sql`lower(${themes.name})`, queryPattern),
        like(sql`lower(${themes.description})`, queryPattern),
        like(sql`lower(${themes.author})`, queryPattern),
        like(sql`lower(${themes.sourceName})`, queryPattern),
        like(sql`lower(${themes.sourceRepo})`, queryPattern),
        like(sql`lower(${themes.tags})`, queryPattern),
      )
      : undefined;
    const publicCondition = eq(themes.status, APPROVED_THEME_STATUS);
    const matchedCondition = and(publicCondition, catalogFilter(filter), searchCondition);

    const [[matchedCount], [catalogStats], [featuredRow]] = await Promise.all([
      getDb().select({ value: count() }).from(themes).where(matchedCondition),
      getDb().select({
        themes: count(),
        sources: countDistinct(themes.sourceRepo),
        creators: countDistinct(themes.author),
      }).from(themes).where(publicCondition),
      getDb().select().from(themes)
        .where(and(publicCondition, eq(themes.featured, true)))
        .orderBy(desc(themes.updatedAt), desc(themes.name))
        .limit(1),
    ]);
    const pagination = getThemePagination(Number(matchedCount?.value ?? 0), requestedPage);
    const rows = await getDb()
      .select()
      .from(themes)
      .where(matchedCondition)
      .orderBy(desc(themes.featured), desc(themes.updatedAt), desc(themes.name))
      .limit(pagination.pageSize)
      .offset(pagination.offset);

    const result = rows.map(serializeTheme);

    return Response.json({
      themes: result,
      featuredTheme: featuredRow ? serializeTheme(featuredRow) : result[0] ?? null,
      stats: {
        themes: Number(catalogStats?.themes ?? 0),
        sources: Number(catalogStats?.sources ?? 0),
        creators: Number(catalogStats?.creators ?? 0),
      },
      pagination,
      query: { q: query, filter },
      syncedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load themes";
    return Response.json({ error: message }, { status: 500 });
  }
}
