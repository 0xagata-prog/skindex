import { getD1 } from "../db";
import type { ThemeAdminSnapshot } from "./theme-admin";

export async function updateThemeWithRevision({
  themeId,
  current,
  next,
  editorEmail,
  action,
}: {
  themeId: string;
  current: ThemeAdminSnapshot;
  next: ThemeAdminSnapshot;
  editorEmail: string;
  action: string;
}) {
  const d1 = getD1();
  const revisionId = crypto.randomUUID();
  const now = new Date().toISOString();
  await d1.batch([
    d1.prepare(`INSERT INTO theme_revisions (id, theme_id, action, snapshot, editor_email, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(revisionId, themeId, action, JSON.stringify(current), editorEmail, now),
    d1.prepare(`UPDATE themes SET
      name = ?, author = ?, author_url = ?, platform = ?, mode = ?, description = ?,
      tags = ?, palette = ?, preview_url = ?, source_url = ?, download_url = ?,
      source_name = ?, source_repo = ?, stars = ?, license = ?, verified_version = ?,
      featured = ?, status = ?, updated_at = ?
      WHERE id = ?`)
      .bind(
        next.name,
        next.author,
        next.authorUrl,
        next.platform,
        next.mode,
        next.description,
        JSON.stringify(next.tags),
        JSON.stringify(next.palette),
        next.previewUrl,
        next.sourceUrl,
        next.downloadUrl,
        next.sourceName,
        next.sourceRepo,
        next.stars,
        next.license,
        next.verifiedVersion,
        next.featured ? 1 : 0,
        next.status,
        now,
        themeId,
      ),
    d1.prepare(`INSERT INTO catalog_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(`theme_override:${themeId}`, editorEmail, now),
  ]);
  return { revisionId, updatedAt: now };
}
