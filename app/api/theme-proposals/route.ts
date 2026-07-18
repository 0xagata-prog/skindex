import { getDb } from "../../../db";
import { themeProposals } from "../../../db/schema";
import { ensureThemeData } from "../../../lib/theme-seed";
import { getThemeAssets } from "../../../storage";

const allowedPlatforms = new Set(["桌面端", "CLI", "全平台"]);
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const hexColor = /^#[0-9a-f]{6}$/i;
const maxPreviewBytes = 4 * 1024 * 1024;

type ProposalMetadata = {
  themeName?: string;
  authorName?: string;
  platform?: string;
  notes?: string;
  palette?: unknown;
  sourceType?: string;
  consent?: boolean;
};

function safeExtension(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

export async function POST(request: Request) {
  let uploadedKey = "";
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return Response.json({ error: "跨站投稿请求已拒绝" }, { status: 403 });
    }

    const data = await request.formData();
    const metadataValue = data.get("metadata");
    const preview = data.get("preview");
    if (typeof metadataValue !== "string" || metadataValue.length > 12_000) {
      return Response.json({ error: "主题信息无效" }, { status: 400 });
    }
    if (!(preview instanceof File)) {
      return Response.json({ error: "请附上主题预览图" }, { status: 400 });
    }

    const metadata = JSON.parse(metadataValue) as ProposalMetadata;
    const themeName = metadata.themeName?.trim() ?? "";
    const authorName = metadata.authorName?.trim() ?? "";
    const platform = metadata.platform?.trim() ?? "";
    const notes = metadata.notes?.trim().slice(0, 500) ?? "";
    const palette = Array.isArray(metadata.palette) ? metadata.palette.map(String) : [];
    const sourceType = metadata.sourceType === "reference-image" ? "reference-image" : "skill-generated";

    if (metadata.consent !== true) {
      return Response.json({ error: "提交前需要用户明确同意上传预览图并进入审核" }, { status: 400 });
    }
    if (themeName.length < 2 || themeName.length > 80) {
      return Response.json({ error: "主题名称需为 2–80 个字符" }, { status: 400 });
    }
    if (authorName.length < 2 || authorName.length > 60) {
      return Response.json({ error: "作者名称需为 2–60 个字符" }, { status: 400 });
    }
    if (!allowedPlatforms.has(platform)) {
      return Response.json({ error: "不支持的平台类型" }, { status: 400 });
    }
    if (palette.length < 3 || palette.length > 6 || palette.some((color) => !hexColor.test(color))) {
      return Response.json({ error: "主题色板需包含 3–6 个十六进制颜色" }, { status: 400 });
    }
    if (!allowedMimeTypes.has(preview.type) || preview.size <= 0 || preview.size > maxPreviewBytes) {
      return Response.json({ error: "预览图需为 PNG、JPEG 或 WebP，且不超过 4 MB" }, { status: 400 });
    }

    await ensureThemeData();
    const id = crypto.randomUUID();
    uploadedKey = `theme-proposals/${id}/preview.${safeExtension(preview.type)}`;
    const consentAt = new Date().toISOString();
    await getThemeAssets().put(uploadedKey, await preview.arrayBuffer(), {
      httpMetadata: { contentType: preview.type },
    });
    await getDb().insert(themeProposals).values({
      id,
      themeName,
      authorName,
      platform,
      notes,
      palette: JSON.stringify(palette),
      previewKey: uploadedKey,
      previewMime: preview.type,
      sourceType,
      consentAt,
    });

    return Response.json({ proposal: { id, status: "pending", consentAt } }, { status: 201 });
  } catch {
    if (uploadedKey) await getThemeAssets().delete(uploadedKey).catch(() => undefined);
    return Response.json({ error: "主题暂时无法提交，请稍后重试" }, { status: 500 });
  }
}
