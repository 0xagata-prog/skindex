Goal:
Publish and maintain SkinDex at the owner-selected canonical URL `https://codex-skindex.vercel.app` while preserving the existing ChatGPT Sites deployment as the D1/R2/SIWC backend.

Current state:
The public GitHub repository is `https://github.com/0xagata-prog/skindex`. The canonical Skill name is `skindex`, invocation is `$skindex`, protocol is `skindex/v1`, and the released repository Skill remains the installation source. A Vercel project named `codex-skindex` owns the exact production alias `https://codex-skindex.vercel.app` and proxies public routes to the existing Sites backend. Vercel deployment `dpl_FUWH45WpRbh8N2BEfVqrbEJLqWdM` is READY with no alias error. Git commit `1d4b95839f1124bf10cd6f4b92caf612123b230e` contains the latest production website revision; the stable Skill remains tagged `v0.5.0`. Sites version 24 and deployment `appgdep_6a5ba78ff8c88191a341d65360dff8ac` are published successfully from that commit, and GitHub release `v0.5.0` contains the verified Skill ZIP.

Files touched or relevant:
README.md
app/layout.tsx
app/globals.css
app/page.tsx
app/api/submissions/route.ts
app/api/theme-proposals/route.ts
app/api/review/themes/[id]/route.ts
app/api/review/themes/[id]/preview/route.ts
app/api/themes/[id]/previews/[asset]/route.ts
app/review/themes/page.tsx
app/review/themes/theme-manager.tsx
lib/theme-admin.ts
lib/theme-admin-store.ts
lib/trusted-origin.ts
lib/theme-seed.ts
catalog/blue-messenger-2007.json
skill/scripts/skindex.mjs
vercel-proxy/vercel.json
vercel-proxy/fallback.html
tests/skindex-adapter.test.mjs
tests/rendered-html.test.mjs

Important decisions:
Vercel is the public URL layer only; ChatGPT Sites remains the data, object storage, and owner-auth backend. Browser-origin checks use an exact allowlist for `codex-skindex.vercel.app` and the legacy Sites origin, never a wildcard for `vercel.app`. The owner review login may redirect to the legacy Sites hostname because SIWC remains hosted there. The old Sites hostname stays live for compatibility. The Skill default endpoint and all official product links use the new Vercel URL.

What to do next:
Use `https://codex-skindex.vercel.app` as the only public URL in future product copy. Keep production dependency audit at zero and let Dependabot open weekly npm and GitHub Actions updates. Monitor Drizzle Kit for a release that removes its deprecated `@esbuild-kit` loader. Prioritize per-client abuse protection for anonymous Skill uploads, retention/garbage collection for old R2 previews and revision rows, and pagination for the review queue. Then add optimistic concurrency to owner edits and indexes/FTS when the catalog grows beyond the current scale. If desired later, migrate SIWC off the legacy Sites hostname or attach a separately owned custom domain; neither is required for the current public product.

Known risks:
The public URL layer depends on the existing Sites backend, so a Sites outage affects the Vercel URL. Sign in with ChatGPT still uses the legacy Sites origin. Existing seeded D1 rows may retain stored legacy source URLs until a later data migration; newly rendered metadata, official links, and the Skill use the canonical Vercel address.

Verification:
`npm ci`, `npm run audit:production`, `npm run typecheck`, `npm run test:skindex`, `npm test`, and lint pass. Production audit reports zero vulnerabilities; 17/17 Skill/security tests and 7/7 rendered-boundary tests pass. The full dependency tree has four moderate development-only findings, all from `drizzle-kit` → deprecated `@esbuild-kit` → old esbuild, with no upstream fix and no production deployment path. Dependabot confirms that its automatic esbuild security update is impossible until Drizzle Kit removes the conflicting loader; this is an upstream development-tool limitation rather than a failed production build. GitHub CI run 29647884981 succeeded on the current production commit. Main requires the `Quality checks` status, PRs, admin enforcement, linear history, and blocks force-push/deletion. Apache-2.0, Dependabot weekly updates, security updates, secret scanning/push protection, and private vulnerability reporting are enabled. Production smoke tests return 200 for the homepage, terms, and catalog; terms display Apache-2.0, the catalog contains 14 themes, and CSP, DENY framing, and nosniff headers remain present. The `v0.5.0` ZIP passes `unzip -t` and has SHA-256 `ae585c73d18a9295fc35e978a1f40429b24c49845a74a71312728e86f8d15e72`.

Security and product audit (2026-07-18, read-only):
The owner-only SIWC boundary resisted direct header spoofing: fake reviewer requests returned 403. All 8 live native manifests validate, all 29 distinct live source/preview/download/author URLs return 2xx/3xx, secret scanning is enabled with zero open alerts, and no secret-shaped values were found in the working tree or Git history. However, do not promote heavily before addressing: the public proposal route trusts a forgeable `X-SkinDex-Client` marker and has no application-level rate limit; the direct Sites hostname bypasses any Vercel-only WAF; native manifest validation accepts unknown/forbidden fields embedded inside `package.inline`; the installer reads the unprotected `main` branch; main has no branch protection/rulesets and Dependabot is disabled; review pages lack CSP/frame protections; forwarded-host input can poison OG metadata; rejected previews are retained; review queries are unbounded; uploads are not re-encoded or stripped of metadata; public legal/privacy/support pages and a repository LICENSE are absent. Production `npm audit` reports 2 moderate PostCSS/Next findings without an automatic fix; the full dependency tree reports 36 findings, mostly build tooling. Build, lint, and 19 existing tests pass, but standalone TypeScript checking fails because Cloudflare Worker types are not configured. Vercel runtime logs are empty because the project is only an external rewrite; Sites Worker logs are the actual observability source. No product code was changed during this audit.

Repair implementation (2026-07-18):
The actionable application findings above are fixed. Public submissions now have D1-backed hourly and pending-queue limits that also apply on the direct Sites backend. Generated previews enforce dimensions and reject EXIF/XMP/text metadata; rejected preview objects are deleted. Review queries are capped. Native inline manifests now have exact nested schemas, length/type/color bounds, forbidden-field rejection, and canonicalized staging. The website installer is pinned to `v0.5.0`; GitHub CI and release workflows use commit-pinned Actions and verify a zero-vulnerability production audit, typecheck, tests, build, and lint before packaging. Compatible Next, Vite, Cloudflare, Wrangler, PostCSS, ws, undici, js-yaml, and Babel updates remove all production findings and all high-severity development findings. Apache-2.0 and private security reporting are present. The remaining architectural risk is the dependency on the legacy Sites backend/SIWC origin; the only package audit findings are the four development-only Drizzle Kit chain findings noted above.

Homepage cohesion pass (2026-07-18):
The Skill section now uses the same light card, border, typography, and purple/lime accent system as the theme catalog instead of appearing as a separate dark tool panel. Every catalog card uses one consistent `打开主题` action; installability is expressed with matching `可直接应用`, `可应用配色`, or `暂不支持导入` pills. Technical `查看兼容状态` and `适配器开发中` copy was removed from the main card surface. Supported themes expose `用 SkinDex 应用` inside details; unsupported third-party themes expose `查看适配说明` without pretending to be installable. Desktop and 390px browser QA passed with 14 consistent theme actions and no fresh console errors.

Theme-card alignment standard (2026-07-18):
Catalog cards are equal-height flex columns. Titles reserve two lines (48px), descriptions reserve three lines (54px), tags reserve one row (27px), and `打开主题` is anchored to the card bottom with `margin-top: auto`. The duplicated footer compatibility pill was removed because the top-right status pill is the single compatibility indicator. Production browser geometry verified identical card heights and exact button Y coordinates across the first two three-column rows, with 14 cards loaded and no console errors or error overlay.

Publishing and catalog scale standard (2026-07-18):
Community, merchant, partner, and SkinDex Lab themes now share one code-enforced publishing contract: 2–64 character names, 2–60 character authors, descriptions capped at 180 characters, at most four unique 16-character tags, and landscape previews of at least 960×540px within a 1.45:1–1.9:1 aspect range. Generated proposals are validated before review and normalized again on approval. The catalog API now performs search and filtering in D1 and returns at most 24 themes per page, with URL-persisted page/search/filter state, desktop page numbers, and compact mobile navigation. A 500-theme test produces 21 pages; production currently returns 14 themes on page 1 and correctly clamps out-of-range requests.

Published-theme management (2026-07-18):
The owner-only `/review/themes` surface now searches and paginates all catalog rows and supports editing normalized metadata, featured state, reversible publish/unpublish, and verified preview replacement. Every mutation requires the configured SIWC reviewer plus an exact same-origin request. Before each change, D1 stores a full snapshot, action, editor email, and timestamp in `theme_revisions`; any listed revision can be restored while preserving the replaced state as a new revision. Preview uploads are signature/metadata/dimension checked and stored at immutable versioned R2 keys. There is deliberately no destructive theme-delete endpoint. Manual owner edits write a `theme_override:<id>` marker so future seed synchronization cannot overwrite them. PR #16 passed required CI and was squash-merged as `1d4b958`; Sites version 24 is live. Typecheck, lint, 20 Skill/security tests, 9 build/render tests, zero-vulnerability production audit, and local/live smoke checks passed.

Backend follow-up audit (2026-07-18):
No new critical or production dependency vulnerability was found. The GitHub moderate alert is the known development-only `drizzle-kit` → `@esbuild-kit` → `esbuild@0.18.20` chain; it is not present in the production runtime and currently has no compatible upstream npm fix. Highest-priority product work is to replace the forgeable static Skill client marker and global-only queue cap with per-client or signed upload authorization. Next, add lifecycle retention for old managed preview objects and revision rows without breaking rollback, paginate the pending-review UI instead of exposing only the latest 100 records, and return explicit 400 responses for malformed JSON/form-data in the older submission/review routes. At larger scale, add status/created-at and catalog ordering indexes, FTS-based search, per-theme revision queries, and optimistic concurrency tokens to prevent two owner tabs from overwriting one another. Also consider moving runtime schema creation out of request paths after Sites migration execution is guaranteed. The canonical homepage and catalog return 200; both canonical and Sites `/review/themes` routes return the expected 307 authentication redirect.
