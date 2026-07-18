import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { themes } from "../../../db/schema";
import { ensureThemeData } from "../../../lib/theme-seed";

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    await ensureThemeData();
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
