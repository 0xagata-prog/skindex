Goal:
Build and publish Codex Theme Hub as a real theme gallery whose current distribution is a standalone `$theme-hub` Skill; defer public plugin distribution until the plugin is listed.

Current state:
The public site is https://codex-theme-hub-cn.jyyang040703.chatgpt.site, deployed as Sites version 8, with a 14-theme D1 catalog and public anonymous browsing. The standalone Skill is now the only Theme Hub download. The old plugin archive and Marketplace installation UI were removed, and the former download URL returns `410 Gone`; plugin source remains in the repository for later listing work. The Skill can query the live catalog, fetch official manifests, create a local data-only theme from generated colors, stage and restore native themes, and submit a generated preview only after explicit consent.

The website no longer recommends Codex App Manager or directly links unsigned Styler installers as one-click actions. `.codexskin` and Styler entries now show adapter-pending compatibility notices and only link to traceable upstream sources. Native `codex-theme-v1` themes still require final confirmation inside Codex.

Submission endpoints were hardened. GitHub submissions now require exact same-origin browser requests, JSON content type, and a 16 KB declared-body ceiling. Skill proposal submissions accept either exact same-origin browser requests or the standalone Skill client marker, enforce a 750 KB declared-body ceiling, retain the 700 KB file limit, and verify PNG/JPEG/WebP magic bytes before R2 upload. Pending previews remain private and explicit consent is still mandatory.

Files touched or relevant:
README.md
docs/theme-hub-framework.md
docs/skill-install.txt
app/page.tsx
app/globals.css
app/layout.tsx
app/api/submissions/route.ts
app/api/theme-proposals/route.ts
app/downloads/codex-theme-hub-plugin.zip/route.ts
lib/image-security.ts
plugins/codex-theme-hub/skills/theme-hub/SKILL.md
plugins/codex-theme-hub/skills/theme-hub/references/deep-link-v1.md
plugins/codex-theme-hub/skills/theme-hub/scripts/theme-hub.mjs
tests/theme-hub-adapter.test.mjs
public/downloads/theme-hub-skill.zip

Important decisions:
Users currently install the loose `theme-hub` Skill folder under `~/.agents/skills/` or `%USERPROFILE%\.agents\skills\`. A `codex://new` link only pre-fills `$theme-hub`; it never installs or sends automatically. Plugin packaging is a future distribution layer and must not appear on the website until public listing. Theme generation is local by default. Uploading a preview is a separate action that requires explicit disclosure and consent and creates only a private pending proposal. No flow patches the Codex app bundle or silently changes appearance.

Verification:
Skill Creator validation passes. `npm run test:theme-hub` passes 12 tests, including image signature validation and the Skill client marker. `npm run lint`, `npm run build`, `git diff --check`, and `unzip -t public/downloads/theme-hub-skill.zip` pass. The archive has `theme-hub/` as its root and contains `SKILL.md`, `agents`, `scripts`, and `references`. Production smoke tests confirm the new archive returns 200, the retired plugin URL returns 410, the catalog returns 14 themes, origin-less GitHub submission returns 403, unmarked proposal submission returns 403, and a fake PNG returns 400 before storage.

What to do next:
Test the downloaded Skill in a fresh Codex task. Before broad promotion, add managed rate limiting and reviewer tooling. Later prepare privacy, terms, support, listing assets, five positive tests, and three negative tests for a skills-only public plugin submission.

Known risks:
The Skill client marker is a public identifier, not authentication; it blocks casual cross-site abuse but not determined automated traffic. There is still no robust server-side rate limit. Third-party preview URLs can create hotlink/privacy risk. Fan-created IP such as the QQ-inspired preview requires rights review. `.codexskin` and Styler adapters remain unavailable. There is no documented direct Codex appearance-import deep link, so supported native imports still require user confirmation.
