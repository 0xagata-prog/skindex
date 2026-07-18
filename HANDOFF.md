Goal:
Build and publish Codex Theme Hub: a real theme gallery whose long-term primary action is “use in Codex” through one conversational, reversible workflow.

Current state:
The public site is https://codex-theme-hub-cn.jyyang040703.chatgpt.site with a 14-theme D1 catalog and public access without a ChatGPT gate. The current source adds a first-class plugin/Skill section, a downloadable development preview bundle, `$theme-hub` conversation deep links, a live per-theme Manifest response through `/api/themes?format=manifest&id=...`, and `/api/theme-proposals` for consent-gated generated-theme submissions. D1 stores proposal metadata and the new `THEME_ASSETS` R2 binding stores preview bytes. Pending previews are not exposed publicly.

The plugin is now v0.2.0. Its `$theme-hub` Skill can query the live catalog, fetch official manifests, create a local data-only theme from generated colors, stage and restore native themes, and submit a generated preview only after explicit `--consent yes`. The website is the data/discovery layer; the plugin is the installable distribution bundle; the Skill is the conversational execution layer. Current official Codex behavior still requires the user to confirm the final Appearance import.

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
app/api/theme-proposals/route.ts
app/api/themes/route.ts
db/schema.ts
drizzle/0001_lyrical_blockbuster.sql
lib/theme-manifest.ts
lib/theme-seed.ts
public/themes/blue-messenger-2007.png
public/downloads/codex-theme-hub-plugin.zip
storage.ts

Important decisions:
Users install the plugin, not a loose skill folder. The plugin bundles `$theme-hub`; the site can ship a development preview archive now, while a true public one-click install requires Plugins Directory review. Theme generation is local by default. Uploading a preview is a separate open-world action that requires an explicit disclosure and yes; it creates a private pending proposal, never an immediate public theme. App Manager remains out of the user-facing product.

Verification:
Skill Creator validation passes. `npm run test:theme-hub` passes 10 tests covering the previous adapter safety cases plus generated-manifest creation, catalog query behavior, and refusal to upload without explicit consent. `npm run lint` and `npm run build` pass with `/api/theme-proposals` included. The R2-backed production submission path still needs a post-deployment smoke test.

What to do next:
Deploy the current source and verify that Sites provisions the `THEME_ASSETS` R2 binding and applies migration 0001. Smoke-test one consented proposal with a disposable preview, then remove or mark the fixture. Test the downloaded plugin bundle in a fresh Codex task. Prepare privacy, terms, support, listing assets, five positive tests, and three negative tests for a skills-only public plugin submission.

Known risks:
There is no documented direct Codex appearance-import deep link, so native import still requires user confirmation. The plugin archive is a development distribution, not a public Marketplace listing; the website must not call it true one-click installation. Anonymous proposal upload needs rate limiting and reviewer tooling before broad promotion. The QQ penguin fan preview remains third-party IP risk. Remote `.codexskin` and Styler adapters remain unavailable.
