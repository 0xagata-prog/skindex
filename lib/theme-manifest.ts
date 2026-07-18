type NativeThemeInput = {
  id: string;
  name: string;
  author: string;
  authorUrl: string;
  mode: string;
  description: string;
  palette: string[];
  previewUrl: string;
  sourceUrl: string;
  license: string;
  updatedAt: string;
};

const semanticColors: Record<string, { diffAdded: string; diffRemoved: string; skill: string }> = {
  "chalkboard-green": { diffAdded: "#9EBB84", diffRemoved: "#D9907E", skill: "#C3A7D8" },
  "cafe-walnut": { diffAdded: "#9EBB84", diffRemoved: "#D9907E", skill: "#C3A7D8" },
  "parchment-and-ink": { diffAdded: "#477A4A", diffRemoved: "#D9907E", skill: "#C3A7D8" },
  "drafting-blue": { diffAdded: "#9EBB84", diffRemoved: "#D9907E", skill: "#C3A7D8" },
  "harbor-fog": { diffAdded: "#397253", diffRemoved: "#A34C4C", skill: "#76558E" },
  "amber-terminal": { diffAdded: "#A6C77B", diffRemoved: "#E08A72", skill: "#C7A5D9" },
  "indigo-workwear": { diffAdded: "#86A98B", diffRemoved: "#D18478", skill: "#A696BB" },
  "blue-messenger-2007": { diffAdded: "#2E9D53", diffRemoved: "#D9493F", skill: "#6A75D7" },
};

const contrast: Record<string, number> = {
  "chalkboard-green": 68,
  "cafe-walnut": 70,
  "parchment-and-ink": 72,
  "drafting-blue": 70,
  "harbor-fog": 71,
  "amber-terminal": 78,
  "indigo-workwear": 72,
  "blue-messenger-2007": 74,
};

export function buildNativeThemePayload(theme: Pick<NativeThemeInput, "id" | "mode" | "palette">) {
  const [surface, ink, accent] = theme.palette;
  return `codex-theme-v1:${JSON.stringify({
    codeThemeId: "codex",
    theme: {
      accent,
      contrast: contrast[theme.id] ?? 72,
      fonts: { code: "Cascadia Mono", ui: "Noto Sans TC" },
      ink,
      opaqueWindows: true,
      semanticColors: semanticColors[theme.id] ?? { diffAdded: "#397253", diffRemoved: "#A34C4C", skill: "#76558E" },
      surface,
    },
    variant: theme.mode === "浅色" ? "light" : "dark",
  })}`;
}

export function buildThemeManifest(theme: NativeThemeInput, origin: string) {
  const previewUrl = new URL(theme.previewUrl, origin).toString();
  return {
    schemaVersion: "theme-hub/v1",
    id: theme.id,
    name: theme.name,
    summary: theme.description,
    author: { name: theme.author, url: theme.authorUrl },
    source: {
      repository: theme.sourceUrl,
      revision: `theme-hub-catalog@${theme.updatedAt}`,
      license: theme.license,
    },
    compatibility: {
      surfaces: ["codex-desktop"],
      os: ["macos", "windows", "linux"],
    },
    preview: { imageUrl: previewUrl },
    package: {
      format: "codex-theme-v1",
      inline: buildNativeThemePayload(theme),
    },
    install: {
      adapter: "codex-native-v1",
      requiresUserConfirmation: true,
      rollback: "restore-point",
    },
    updatedAt: theme.updatedAt,
  };
}
