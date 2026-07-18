import { getD1 } from "../db";

type SubmissionKind = "proposal" | "repository";

const LIMITS: Record<SubmissionKind, { table: string; hourly: number; pending: number }> = {
  proposal: { table: "theme_proposals", hourly: 10, pending: 50 },
  repository: { table: "submissions", hourly: 30, pending: 100 },
};

export async function submissionCapacity(kind: SubmissionKind) {
  const limit = LIMITS[kind];
  const row = await getD1().prepare(`SELECT
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN created_at >= datetime('now', '-1 hour') THEN 1 END) AS hourly_count
    FROM ${limit.table}`).first<{ pending_count: number; hourly_count: number }>();
  const pending = Number(row?.pending_count ?? 0);
  const hourly = Number(row?.hourly_count ?? 0);
  if (pending >= limit.pending) return { allowed: false as const, error: "审核队列暂时已满，请稍后再试", retryAfter: 3600 };
  if (hourly >= limit.hourly) return { allowed: false as const, error: "近期投稿较多，请一小时后再试", retryAfter: 3600 };
  return { allowed: true as const };
}

export function capacityResponse(result: { allowed: false; error: string; retryAfter: number }) {
  return Response.json({ error: result.error }, {
    status: 429,
    headers: { "Retry-After": String(result.retryAfter), "Cache-Control": "no-store" },
  });
}
