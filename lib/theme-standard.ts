export const THEME_CARD_STANDARD = Object.freeze({
  nameMin: 2,
  nameMax: 64,
  authorMin: 2,
  authorMax: 60,
  descriptionMax: 180,
  tagMax: 4,
  tagLengthMax: 16,
  previewMinWidth: 960,
  previewMinHeight: 540,
  previewAspectMin: 1.45,
  previewAspectMax: 1.9,
});

export function validateThemeIdentity(name: string, author: string) {
  if (name.length < THEME_CARD_STANDARD.nameMin || name.length > THEME_CARD_STANDARD.nameMax) {
    return `主题名称需为 ${THEME_CARD_STANDARD.nameMin}–${THEME_CARD_STANDARD.nameMax} 个字符`;
  }
  if (author.length < THEME_CARD_STANDARD.authorMin || author.length > THEME_CARD_STANDARD.authorMax) {
    return `作者名称需为 ${THEME_CARD_STANDARD.authorMin}–${THEME_CARD_STANDARD.authorMax} 个字符`;
  }
  return null;
}

export function normalizeCatalogDescription(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, THEME_CARD_STANDARD.descriptionMax);
}

export function normalizeCatalogTags(values: string[]) {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))]
    .map((value) => value.slice(0, THEME_CARD_STANDARD.tagLengthMax))
    .slice(0, THEME_CARD_STANDARD.tagMax);
}

export function validateThemePreviewDimensions(width: number, height: number) {
  const aspect = width / height;
  if (width < THEME_CARD_STANDARD.previewMinWidth || height < THEME_CARD_STANDARD.previewMinHeight) {
    return `预览图至少需要 ${THEME_CARD_STANDARD.previewMinWidth}×${THEME_CARD_STANDARD.previewMinHeight}px`;
  }
  if (aspect < THEME_CARD_STANDARD.previewAspectMin || aspect > THEME_CARD_STANDARD.previewAspectMax) {
    return "预览图需为横向构图，建议使用 16:9（允许 1.45:1–1.9:1）";
  }
  return null;
}
