# Theme Manifest v1

Theme Hub manifests are declarative data. They describe provenance, compatibility, preview media, a package, and the adapter that may handle it. They never carry shell commands or executable installation scripts.

The canonical JSON Schema is at `../../../schemas/theme-manifest-v1.schema.json` from this reference file. Validate every manifest with `scripts/theme-hub.mjs` because the runtime also enforces adapter-to-format matching and native payload structure.

## Supported formats

| Package format | Adapter | v1 behavior |
| --- | --- | --- |
| `codex-theme-v1` | `codex-native-v1` | Validate, store, prepare the exact Codex import payload, and record rollback state. |
| `codexskin-v1` | `codexskin-runtime-v1` | Recognized but unavailable until the runtime can be bundled behind Theme Hub. |
| `codex-styler-theme-v1` | `codex-styler-v1` | Recognized but unavailable until a data-only adapter is verified. |

## Integrity and provenance

- Require HTTPS for repository, preview, manifest, and package URLs.
- Require `package.integrity` with SHA-256 for every remotely downloaded package.
- Permit an inline payload only for `codex-theme-v1`.
- Store the manifest, native payload, transaction, and previous active pointer under the managed state root.
- Do not infer permission to run repository scripts from a verified repository URL.

## Managed storage

- macOS and Linux: `~/.codex-theme-hub/`
- Windows: `%LOCALAPPDATA%\CodexThemeHub\`
- Test override: `--state-root <path>` or `CODEX_THEME_HUB_HOME`

Staging does not mean the theme is active. Mark it active only after the user confirms the import succeeded in Codex.
