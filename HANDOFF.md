Goal:
Build and publish Codex Theme Hub: a real theme gallery whose long-term primary action is “use in Codex” through one conversational, reversible workflow.

Current state:
The public site is https://codex-theme-hub-cn.jyyang040703.chatgpt.site with D1-backed `/api/themes`, `/api/submissions`, and public access without a ChatGPT gate. The current source is prepared to add a fourteenth catalog record, `Blue Messenger 2007`, as the first Theme Hub Lab reference-image experiment. Its preview uses an original blue retro desktop layout and assistant robot plus two restrained QQ penguin fan elements requested by the user; the catalog explicitly labels it an unofficial fan concept and credits ownership of the penguin to Tencent. The currently importable payload is the original ice-blue `codex-theme-v1` palette, not the full three-column layout or characters.

The repo now also contains the framework approved after the App Manager/download UX review: `Theme Manifest v1`, a repo-scoped `codex-theme-hub` Marketplace and plugin, a deep-link request protocol, and a deterministic native adapter. The native adapter validates data-only manifests, rejects executable or unknown fields, checks OS compatibility, stores themes under a managed Theme Hub directory rather than Downloads, stages transactions, records the previous confirmed theme, prepares the exact `codex-theme-v1` payload, and resolves rollback plans. The plugin skill makes the user-confirmation boundary explicit because current official Codex deep links prefill but do not auto-send or import appearance payloads.

Files touched or relevant:
README.md
docs/theme-hub-framework.md
.agents/plugins/marketplace.json
plugins/codex-theme-hub/.codex-plugin/plugin.json
plugins/codex-theme-hub/schemas/theme-manifest-v1.schema.json
plugins/codex-theme-hub/catalog/chalkboard-green.json
plugins/codex-theme-hub/catalog/blue-messenger-2007.json
plugins/codex-theme-hub/skills/theme-hub/SKILL.md
plugins/codex-theme-hub/skills/theme-hub/agents/openai.yaml
plugins/codex-theme-hub/skills/theme-hub/references/manifest-v1.md
plugins/codex-theme-hub/skills/theme-hub/references/deep-link-v1.md
plugins/codex-theme-hub/skills/theme-hub/scripts/theme-hub.mjs
tests/theme-hub-adapter.test.mjs
package.json
app/page.tsx
app/globals.css
lib/theme-seed.ts
public/themes/blue-messenger-2007.png

Important decisions:
The website is the discovery layer; the Codex plugin is the execution layer. App Manager is not part of the user-facing product. `codex-theme-v1` is the only active v0.1 adapter. `.codexskin` and Codex Styler formats are recognized but deliberately unavailable until their runtimes can be hidden behind trusted, reversible adapters. Manifests are declarative and cannot include commands, scripts, hooks, executable paths, non-HTTPS package URLs, or remote packages without SHA-256. Theme Hub Lab may turn user references into previews, but third-party IP must be labeled as unofficial fan work and kept separate from the original importable payload. Do not switch the production card action to the Codex deep link until a public/reachable Theme Hub Marketplace and per-theme manifest endpoint exist.

Verification:
Plugin validation passed. Skill validation passed. JSON and YAML metadata parse successfully. `npm run test:theme-hub` passes 7 tests covering validation of every bundled catalog manifest, executable/unknown-field rejection, OS compatibility, managed staging, confirmation, previous-theme rollback, and official-default fallback. `npm run lint` and `npm run build` pass. The sample manifest also passes the CLI `validate` and `plan` commands.

What to do next:
Add a per-theme Manifest API generated from the real D1 catalog and include SHA-256 for remote packages. Decide the public GitHub repository/Marketplace identity, publish it, and test first-time installation in a fresh Codex task. Then change the website card action to `codex://new?prompt=<encoded plugin mention + theme_hub_request>` with the existing download/copy flow as fallback. After that, implement and cross-platform test internal `.codexskin` and Styler adapters.

Known risks:
There is no documented direct Codex appearance-import deep link, so native v0.1 still requires the user to paste and confirm inside Appearance settings. The adapter records Theme Hub state but cannot independently verify the Codex UI state; it waits for user confirmation before marking a transaction active. The repo Marketplace is local development infrastructure, not yet a public Marketplace known to users. The plugin has not been installed into the current app or tested in a fresh task. The QQ penguin in the Blue Messenger preview is third-party fan-use IP and may need removal or formal permission if the project becomes commercial or receives a rights complaint; the importable palette itself remains original. Anonymous submissions, stale GitHub metadata, and preview hotlink risks from the deployed site remain unchanged.
