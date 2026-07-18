import type { themes } from "../db/schema";
import {
  THEME_CARD_STANDARD,
  normalizeCatalogDescription,
  normalizeCatalogTags,
  validateThemeIdentity,
} from "./theme-standard.ts";

const allowedPlatforms = new Set(["桌面端", "CLI", "全平台"]);
const allowedModes = new Set(["深色", "浅色", "双模式"]);
const allowedStatuses = new Set(["approved", "unpublished"]);
const hexColor = /^#[0-9a-f]{6}$/i;

export type ThemeAdminSnapshot = {
  name: string;
  author: string;
  authorUrl: string;
  platform: string;
  mode: string;
  description: string;
  tags: string[];
  palette: string[];
  previewUrl: string;
  sourceUrl: string;
  downloadUrl: string;
  sourceName: string;
  sourceRepo: string;
  stars: number;
  license: string;
  verifiedVersion: string;
  featured: boolean;
  status: "approved" | "unpublished";
};

type ParseResult = { ok: true; value: ThemeAdminSnapshot } | { ok: false; error: string };

function text(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function validUrl(value: string, allowRelative = false) {
  if (allowRelative && value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function snapshotTheme(theme: typeof themes.$inferSelect): ThemeAdminSnapshot {
  const list = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };
  return {
    name: theme.name,
    author: theme.author,
    authorUrl: theme.authorUrl,
    platform: theme.platform,
    mode: theme.mode,
    description: theme.description,
    tags: list(theme.tags),
    palette: list(theme.palette),
    previewUrl: theme.previewUrl,
    sourceUrl: theme.sourceUrl,
    downloadUrl: theme.downloadUrl,
    sourceName: theme.sourceName,
    sourceRepo: theme.sourceRepo,
    stars: theme.stars,
    license: theme.license,
    verifiedVersion: theme.verifiedVersion,
    featured: theme.featured,
    status: theme.status === "approved" ? "approved" : "unpublished",
  };
}

export function parseThemeAdminPayload(payload: unknown): ParseResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, error: "主题资料格式无效" };
  const record = payload as Record<string, unknown>;
  const name = text(record.name);
  const author = text(record.author);
  const identityError = validateThemeIdentity(name, author);
  if (identityError) return { ok: false, error: identityError };

  const descriptionRaw = text(record.description);
  if (!descriptionRaw || descriptionRaw.length > THEME_CARD_STANDARD.descriptionMax) {
    return { ok: false, error: `主题简介需为 1–${THEME_CARD_STANDARD.descriptionMax} 个字符` };
  }
  const rawTags = Array.isArray(record.tags) ? record.tags.map(String) : [];
  const tags = normalizeCatalogTags(rawTags);
  if (tags.length < 1 || rawTags.length > THEME_CARD_STANDARD.tagMax || rawTags.some((tag) => text(tag).length > THEME_CARD_STANDARD.tagLengthMax)) {
    return { ok: false, error: "主题标签需为 1–4 个，每个不超过 16 个字符" };
  }
  const palette = Array.isArray(record.palette) ? record.palette.map((color) => text(color).toUpperCase()) : [];
  if (palette.length < 3 || palette.length > 6 || palette.some((color) => !hexColor.test(color))) {
    return { ok: false, error: "主题色板需包含 3–6 个十六进制颜色" };
  }

  const authorUrl = text(record.authorUrl);
  const previewUrl = text(record.previewUrl);
  const sourceUrl = text(record.sourceUrl);
  const downloadUrl = text(record.downloadUrl);
  if (!validUrl(authorUrl) || !validUrl(sourceUrl) || !validUrl(downloadUrl) || !validUrl(previewUrl, true)) {
    return { ok: false, error: "作者、预览、来源和下载地址必须是有效的 HTTPS 地址" };
  }

  const platform = text(record.platform);
  const mode = text(record.mode);
  const status = text(record.status);
  if (!allowedPlatforms.has(platform) || !allowedModes.has(mode) || !allowedStatuses.has(status)) {
    return { ok: false, error: "平台、模式或上架状态无效" };
  }

  const sourceName = text(record.sourceName);
  const sourceRepo = text(record.sourceRepo);
  const license = text(record.license);
  const verifiedVersion = text(record.verifiedVersion);
  if (!sourceName || sourceName.length > 80 || !sourceRepo || sourceRepo.length > 160 || !license || license.length > 120 || !verifiedVersion || verifiedVersion.length > 120) {
    return { ok: false, error: "来源、仓库、许可或验证信息不符合长度要求" };
  }
  const stars = Number(record.stars);
  if (!Number.isInteger(stars) || stars < 0 || stars > 1_000_000_000) return { ok: false, error: "GitHub 星标数无效" };

  return {
    ok: true,
    value: {
      name,
      author,
      authorUrl,
      platform,
      mode,
      description: normalizeCatalogDescription(descriptionRaw),
      tags,
      palette,
      previewUrl,
      sourceUrl,
      downloadUrl,
      sourceName,
      sourceRepo,
      stars,
      license,
      verifiedVersion,
      featured: record.featured === true,
      status: status as "approved" | "unpublished",
    },
  };
}
