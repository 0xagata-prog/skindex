import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { themeProposals } from "../../../../../../db/schema";
import { getAuthorizedReviewer } from "../../../../../../lib/reviewer-auth";
import { getThemeAssets } from "../../../../../../storage";
import { PENDING_REVIEW_STATUS } from "../../../../../../lib/review-policy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const reviewer = await getAuthorizedReviewer();
  if (!reviewer) return new Response("Forbidden", { status: 403 });

  const { id } = await context.params;
  const [proposal] = await getDb().select().from(themeProposals)
    .where(and(eq(themeProposals.id, id), eq(themeProposals.status, PENDING_REVIEW_STATUS))).limit(1);
  if (!proposal) return new Response("Not found", { status: 404 });
  const object = await getThemeAssets().get(proposal.previewKey);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(await object.arrayBuffer(), {
    headers: {
      "Content-Type": proposal.previewMime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
