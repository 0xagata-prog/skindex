# Dream Skin Runtime v1

SkinDex is the catalog and orchestration layer. Codex Dream Skin is the third-party local rendering engine. The v1 bridge supports only the reviewed `gothic-void-crusade` catalog entry on macOS.

## Trust boundary

- Repository: `https://github.com/Fei-Away/Codex-Dream-Skin`
- Pinned revision: `3af1d6d62f3a0388cc640d2f497ac3100998938e`
- Runtime preset: `preset-gothic-void-crusade`
- Transport: loopback CDP
- Codex application bundle: never modified
- Install root: `~/.codex/codex-dream-skin-studio`

The catalog runtime plan is data only. It cannot provide commands, scripts, hooks, executable paths, alternate repositories, or alternate revisions. The local CLI owns the exact command allowlist and validates real paths before execution.

## Consent boundary

Installing the third-party runtime and applying a theme are separate approvals. Explain that installation downloads and runs the pinned upstream installer, and that a cold apply or restore can restart Codex. Never force-close Codex, silently enable CDP, or treat a website click as approval for local execution.

## Platform boundary

The current stable adapter is macOS-only because the reviewed upstream exposes standalone macOS switch and restore commands and ships this preset there. Windows support must remain unavailable until an equivalent pinned, testable interface and preset exist.
