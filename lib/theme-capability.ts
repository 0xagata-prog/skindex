export type ThemeSupportLevel = "full-skin-source" | "native" | "partial" | "adapter-pending";

type ThemeCapabilityInput = {
  sourceRepo: string;
  verifiedVersion: string;
};

export function getThemeInstallability(theme: ThemeCapabilityInput) {
  if (theme.sourceRepo === "Fei-Away/Codex-Dream-Skin") {
    return {
      supportLevel: "full-skin-source" as const,
      adapter: "dream-skin-runtime-v1" as const,
      action: "view-source" as const,
      requiresUserConfirmation: true,
      rollback: "upstream-restore" as const,
    };
  }

  if (theme.verifiedVersion.includes("codex-theme-v1")) {
    const partial = theme.sourceRepo === "skindex/lab" || theme.sourceRepo === "theme-hub/lab";
    return {
      supportLevel: partial ? "partial" as const : "native" as const,
      adapter: "codex-native-v1" as const,
      action: "guided-import" as const,
      requiresUserConfirmation: true,
      rollback: "restore-point" as const,
    };
  }

  if (theme.sourceRepo === "Wangnov/awesome-codex-skins") {
    return {
      supportLevel: "adapter-pending" as const,
      adapter: "codexskin-runtime-v1" as const,
      action: "view-source" as const,
      requiresUserConfirmation: true,
      rollback: "unavailable" as const,
    };
  }

  return {
    supportLevel: "adapter-pending" as const,
    adapter: "codex-styler-v1" as const,
    action: "view-source" as const,
    requiresUserConfirmation: true,
    rollback: "unavailable" as const,
  };
}
