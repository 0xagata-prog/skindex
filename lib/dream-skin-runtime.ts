export const DREAM_SKIN_REPOSITORY = "https://github.com/Fei-Away/Codex-Dream-Skin";
export const DREAM_SKIN_REVISION = "3af1d6d62f3a0388cc640d2f497ac3100998938e";

const RUNTIME_THEMES = {
  "gothic-void-crusade": {
    name: "哥特虚空远征 · Gothic Void Crusade",
    presetId: "preset-gothic-void-crusade",
    platforms: ["macos"],
    capabilities: ["background", "palette", "icons", "layout", "motion", "custom-ui"],
  },
} as const;

export type DreamSkinThemeId = keyof typeof RUNTIME_THEMES;

export function buildDreamSkinRuntimePlan(themeId: string, origin: string) {
  const theme = RUNTIME_THEMES[themeId as DreamSkinThemeId];
  if (!theme) return null;

  return {
    schemaVersion: "skindex/runtime-plan/v1",
    themeId,
    name: theme.name,
    engine: "dream-skin",
    adapter: "dream-skin-runtime-v1",
    platforms: [...theme.platforms],
    capabilities: [...theme.capabilities],
    source: {
      repository: DREAM_SKIN_REPOSITORY,
      revision: DREAM_SKIN_REVISION,
      upstream: true,
    },
    runtime: {
      presetId: theme.presetId,
      installRoot: "~/.codex/codex-dream-skin-studio",
      transport: "loopback-cdp",
      mutatesCodexBundle: false,
    },
    consent: {
      installRequired: true,
      applyRequired: true,
      mayRestartCodex: true,
      thirdPartyCode: true,
    },
    rollback: {
      supported: true,
      adapter: "upstream-restore",
    },
    catalogUrl: `${origin}/api/themes?id=${encodeURIComponent(themeId)}`,
  };
}
