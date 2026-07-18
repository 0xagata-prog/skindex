import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { themes } from "../../../db/schema";
import { buildThemeManifest } from "../../../lib/theme-manifest";
import { ensureThemeData } from "../../../lib/theme-seed";

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
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
      if (!theme || theme.status !== "approved") return Response.json({ error: "主题不存在" }, { status: 404 });
      if (!theme.verifiedVersion.includes("codex-theme-v1")) {
        return Response.json({ error: "这个主题暂不支持原生 Skill 导入" }, { status: 409 });
      }
      const manifest = buildThemeManifest({
        ...theme,
        palette: parseList(theme.palette),
      }, url.origin);
      return Response.json(manifest, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
    }

    const rows = await getDb()
      .select()
      .from(themes)
      .where(eq(themes.status, "approved"))
      .orderBy(desc(themes.featured), desc(themes.updatedAt), desc(themes.name));

    const result = rows.map((theme) => ({
      ...theme,
      tags: parseList(theme.tags),
      palette: parseList(theme.palette),
    }));
    const sources = new Set(result.map((theme) => theme.sourceRepo));
    const creators = new Set(result.map((theme) => theme.author));

    return Response.json({
      themes: result,
      stats: { themes: result.length, sources: sources.size, creators: creators.size },
      syncedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load themes";
    return Response.json({ error: message }, { status: 500 });
  }
}
