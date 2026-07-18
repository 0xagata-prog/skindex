import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { themeProposals } from "../../../../../db/schema";
import { APPROVED_THEME_STATUS } from "../../../../../lib/review-policy";
import { getThemeAssets } from "../../../../../storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const [proposal] = await getDb().select().from(themeProposals)
    .where(and(eq(themeProposals.id, id), eq(themeProposals.status, APPROVED_THEME_STATUS))).limit(1);
  if (!proposal) return new Response("Not found", { status: 404 });
  const object = await getThemeAssets().get(proposal.previewKey);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(await object.arrayBuffer(), {
    headers: {
      "Content-Type": proposal.previewMime,
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
