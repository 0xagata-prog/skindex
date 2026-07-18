Goal:
Publish SkinDex at the owner-selected canonical URL `https://codex-skindex.vercel.app` while preserving the existing ChatGPT Sites deployment as the D1/R2/SIWC backend.

Current state:
The public GitHub repository is `https://github.com/0xagata-prog/skindex`. The canonical Skill name is `skindex`, invocation is `$skindex`, protocol is `skindex/v1`, and the released repository Skill remains the installation source. A Vercel project named `codex-skindex` owns the exact production alias `https://codex-skindex.vercel.app` and proxies public routes to the existing Sites backend. Vercel deployment `dpl_AJofAb6M4b9KoKWbjuvmF6kPpVP9` is READY with no alias error. Git commit `3f55a0937e9badd421bdb64a0fdc5d3b03d37631` is pushed. Sites version 17 is published successfully from that commit, and GitHub release `v0.4.1` is published with the canonical endpoint in the packaged Skill.

Files touched or relevant:
README.md
app/layout.tsx
app/page.tsx
app/api/submissions/route.ts
app/api/theme-proposals/route.ts
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
Use `https://codex-skindex.vercel.app` as the only public URL in future product copy. If desired later, migrate SIWC off the legacy Sites hostname or attach a separately owned custom domain; neither is required for the current public product.

Known risks:
The public URL layer depends on the existing Sites backend, so a Sites outage affects the Vercel URL. Sign in with ChatGPT still uses the legacy Sites origin. Existing seeded D1 rows may retain stored legacy source URLs until a later data migration; newly rendered metadata, official links, and the Skill use the canonical Vercel address.

Verification:
`npm run test:skindex` passes 14/14, `npm test` passes the production build and 5/5 product/security tests, lint passes, and `git diff --check` passes. Production smoke tests return 200 for the homepage and catalog with 14 themes, 307 for the Skill download to GitHub, and 307 for owner review to SIWC. An attacker Origin receives 403; the exact Vercel Origin reaches normal request validation and receives the expected 400 for missing consent. GitHub Actions release run 29644744234 succeeded. The `v0.4.1` ZIP passes `unzip -t`, has SHA-256 `f78dd4443af7da299b919207d7fb20e9c09a43d85d562e589aa425f178833627`, and contains `DEFAULT_ENDPOINT = \"https://codex-skindex.vercel.app\"`.

Security and product audit (2026-07-18, read-only):
The owner-only SIWC boundary resisted direct header spoofing: fake reviewer requests returned 403. All 8 live native manifests validate, all 29 distinct live source/preview/download/author URLs return 2xx/3xx, secret scanning is enabled with zero open alerts, and no secret-shaped values were found in the working tree or Git history. However, do not promote heavily before addressing: the public proposal route trusts a forgeable `X-SkinDex-Client` marker and has no application-level rate limit; the direct Sites hostname bypasses any Vercel-only WAF; native manifest validation accepts unknown/forbidden fields embedded inside `package.inline`; the installer reads the unprotected `main` branch; main has no branch protection/rulesets and Dependabot is disabled; review pages lack CSP/frame protections; forwarded-host input can poison OG metadata; rejected previews are retained; review queries are unbounded; uploads are not re-encoded or stripped of metadata; public legal/privacy/support pages and a repository LICENSE are absent. Production `npm audit` reports 2 moderate PostCSS/Next findings without an automatic fix; the full dependency tree reports 36 findings, mostly build tooling. Build, lint, and 19 existing tests pass, but standalone TypeScript checking fails because Cloudflare Worker types are not configured. Vercel runtime logs are empty because the project is only an external rewrite; Sites Worker logs are the actual observability source. No product code was changed during this audit.

Repair implementation (2026-07-18):
The actionable application findings above are fixed for v0.5.0. Public submissions now have D1-backed hourly and pending-queue limits that also apply on the direct Sites backend. Generated previews enforce dimensions and reject EXIF/XMP/text metadata; rejected preview objects are deleted. Review queries are capped. Native inline manifests now have exact nested schemas, length/type/color bounds, forbidden-field rejection, and canonicalized staging. The website installer is pinned to `v0.5.0`; GitHub CI and release workflows use commit-pinned Actions and verify typecheck/tests/build/lint before packaging. Metadata has a fixed canonical origin, Worker and Vercel responses set anti-framing and related security headers, and privacy/terms/support/robots/sitemap/favicon are present. Seed writes are versioned, proposal schema/index creation is portable, source counts/stars are corrected and labeled as snapshots. Local verification passes TypeScript, 17 Skill/security tests, production build, 7 rendered-boundary tests, lint, route smoke checks, and header checks. Remaining known items are the upstream Next/PostCSS production audit finding with no available fix, the absent repository LICENSE (owner choice required), and the architectural dependency on the legacy Sites backend/SIWC origin. Publishing v0.5.0 and enabling GitHub protections are the next steps.
