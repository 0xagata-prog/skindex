import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { themes } from "../../../../../../db/schema";
import { inspectImageUpload } from "../../../../../../lib/image-security";
import { getAuthorizedReviewer } from "../../../../../../lib/reviewer-auth";
import { ensureThemeData } from "../../../../../../lib/theme-seed";
import { snapshotTheme } from "../../../../../../lib/theme-admin";
import { updateThemeWithRevision } from "../../../../../../lib/theme-admin-store";
import { validateThemePreviewDimensions } from "../../../../../../lib/theme-standard";
import { getThemeAssets } from "../../../../../../storage";

const CANONICAL_ORIGIN = "https://codex-skindex.vercel.app";
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxPreviewBytes = 700 * 1024;

type RouteContext = { params: Promise<{ id: string }> };

function extension(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

export async function POST(request: Request, context: RouteContext) {
  const reviewer = await getAuthorizedReviewer();
  if (!reviewer) return Response.json({ error: "没有主题管理权限" }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "跨站预览图请求已拒绝" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return Response.json({ error: "预览图上传格式无效" }, { status: 415 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 750 * 1024) return Response.json({ error: "预览图过大" }, { status: 413 });

  await ensureThemeData();
  const { id } = await context.params;
  const [currentTheme] = await getDb().select().from(themes).where(eq(themes.id, id)).limit(1);
  if (!currentTheme) return Response.json({ error: "主题不存在" }, { status: 404 });
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return Response.json({ error: "预览图表单无法解析" }, { status: 400 });
  }
  const preview = data.get("preview");
  if (!(preview instanceof File) || !allowedMimeTypes.has(preview.type) || preview.size <= 0 || preview.size > maxPreviewBytes) {
    return Response.json({ error: "预览图需为 PNG、JPEG 或 WebP，且不超过 700 KB" }, { status: 400 });
  }
  const bytes = await preview.arrayBuffer();
  const inspection = inspectImageUpload(preview.type, bytes);
  if (!inspection.ok) return Response.json({ error: inspection.error }, { status: 400 });
  const dimensionError = validateThemePreviewDimensions(inspection.width, inspection.height);
  if (dimensionError) return Response.json({ error: dimensionError }, { status: 400 });

  const asset = `${crypto.randomUUID()}.${extension(preview.type)}`;
  const key = `managed-themes/${id}/${asset}`;
  const previewUrl = `${CANONICAL_ORIGIN}/api/themes/${encodeURIComponent(id)}/previews/${asset}`;
  try {
    await getThemeAssets().put(key, bytes, { httpMetadata: { contentType: preview.type } });
    const current = snapshotTheme(currentTheme);
    const result = await updateThemeWithRevision({
      themeId: id,
      current,
      next: { ...current, previewUrl },
      editorEmail: reviewer.email,
      action: "replace-preview",
    });
    return Response.json({ theme: { id, previewUrl, updatedAt: result.updatedAt }, revisionId: result.revisionId });
  } catch {
    await getThemeAssets().delete(key).catch(() => undefined);
    return Response.json({ error: "预览图暂时无法保存" }, { status: 500 });
  }
}
