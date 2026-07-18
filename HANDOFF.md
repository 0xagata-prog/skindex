Goal:
Build and publish Codex Theme Hub as a real theme gallery whose current distribution is a standalone `$theme-hub` Skill; defer public plugin distribution until the plugin is listed.

Current state:
The public GitHub repository is https://github.com/0xagata-prog/codex-theme-hub and the latest published standalone Skill release is v0.2.0. GitHub is the only Skill source/version distribution layer, and `.github/workflows/release-skill.yml` packages future `v*` tags. The public site is https://codex-theme-hub-cn.jyyang040703.chatgpt.site, deployed as Sites version 10 from commit `d96457f79bcc854fc2305ff5a24244611721077c`, with a 14-theme D1 catalog and public anonymous browsing.

The live v0.2.0 source implements the first “two clicks” product framework. First install: the website opens a prefilled generic Codex task that verifies the official GitHub Release, target directory, and existing version, then waits for confirmation before writing the Skill. Manual GitHub download remains the fallback. Daily theme use: supported theme cards open a theme-specific `$theme-hub` task carrying only `themeId` and the official Manifest URL. The Skill validates, plans, creates a restore point, and stages; the user still confirms the final Codex Appearance import.

The current local source adds the v0.3.0 review-first submission policy and is ready to publish. Repository submissions and generated-theme proposals explicitly enter `pending`, return `public: false` plus `publication: review-required`, and cannot appear in the public catalog until their theme status is `approved`. The repository form requires an explicit publication-review checkbox and returns a short review ID. After creating a local theme, the Skill proactively offers submission once; an interested answer is not upload consent, so it then discloses every field and thumbnail and waits for a second confirmation.

Catalog API responses now expose a shared installability contract with `native`, `partial`, and `adapter-pending` support levels. Native and partial themes use `guided-import`; adapter-pending themes use `view-source` and never display a false install action. Manifest v1 optionally carries `install.experience` and `install.supportLevel`, while validation and adapter checks remain authoritative.

The website no longer recommends Codex App Manager or directly links unsigned Styler installers as one-click actions. `.codexskin` and Styler entries now show adapter-pending compatibility notices and only link to traceable upstream sources. Native `codex-theme-v1` themes still require final confirmation inside Codex.

Submission endpoints were hardened. GitHub submissions now require exact same-origin browser requests, JSON content type, and a 16 KB declared-body ceiling. Skill proposal submissions accept either exact same-origin browser requests or the standalone Skill client marker, enforce a 750 KB declared-body ceiling, retain the 700 KB file limit, and verify PNG/JPEG/WebP magic bytes before R2 upload. Pending previews remain private and explicit consent is still mandatory.

Files touched or relevant:
README.md
docs/theme-hub-framework.md
docs/skill-install.txt
.github/workflows/release-skill.yml
app/page.tsx
app/globals.css
app/layout.tsx
app/api/submissions/route.ts
app/api/theme-proposals/route.ts
app/downloads/codex-theme-hub-plugin.zip/route.ts
lib/theme-capability.ts
lib/review-policy.ts
lib/image-security.ts
plugins/codex-theme-hub/skills/theme-hub/SKILL.md
plugins/codex-theme-hub/skills/theme-hub/references/deep-link-v1.md
plugins/codex-theme-hub/skills/theme-hub/scripts/theme-hub.mjs
tests/theme-hub-adapter.test.mjs
tests/rendered-html.test.mjs
app/downloads/theme-hub-skill.zip/route.ts

Important decisions:
“One click” means opening a safe, reviewable Codex task, not silent browser installation or appearance mutation. The initial installer prompt does not invoke `$theme-hub` because the Skill may not exist yet; it names the official GitHub source and targets `~/.agents/skills/theme-hub` or `%USERPROFILE%\.agents\skills\theme-hub`, discloses writes, protects existing installs, and waits for confirmation. Theme deep links invoke `$theme-hub` only after installation and carry a small structured request. Plugin packaging is the future official installable distribution layer and must not appear on the website until listing. No flow patches the Codex app bundle or silently changes appearance.

All user submissions require review before publication. The first post-creation question asks only whether the user is interested in submitting; the second confirmation, after exact disclosure, authorizes upload. Review administration is intentionally not exposed yet because reviewer identity and authentication have not been selected.

Verification:
The v0.3.0 source passes Skill Creator validation, `npm run test:theme-hub` (13 tests), `npm test` (build plus 3 product-policy tests), `npm run lint`, and `git diff --check`. The previous v0.2.0 Release archive and Sites version 10 passed production verification.

What to do next:
Validate and publish v0.3.0, deploy the updated site, and smoke-test the review-required API responses. Then decide who is allowed to review (owner-only, named team, or workspace) before building reviewer tooling. Before broad promotion, add managed rate limiting and build the missing `.codexskin` and Styler adapters.

Known risks:
The guided installer is a prefilled Codex task, not an official install protocol; it still depends on Codex network/filesystem approvals and a new chat after installation. There is no documented direct Codex appearance-import deep link, so supported native imports still require user confirmation. The Skill client marker is a public identifier, not authentication, and there is still no robust server-side rate limit. Third-party preview URLs create hotlink/privacy risk. Fan-created IP requires rights review. `.codexskin` and Styler adapters remain unavailable.
