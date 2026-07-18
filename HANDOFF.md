Goal:
Publish SkinDex at the owner-selected canonical URL `https://codex-skindex.vercel.app` while preserving the existing ChatGPT Sites deployment as the D1/R2/SIWC backend.

Current state:
The public GitHub repository is `https://github.com/0xagata-prog/skindex`. The canonical Skill name is `skindex`, invocation is `$skindex`, protocol is `skindex/v1`, and the released repository Skill remains the installation source. A Vercel project named `codex-skindex` now owns the exact production alias `https://codex-skindex.vercel.app` and proxies public routes to the existing Sites backend. The latest verified Vercel deployment is `dpl_AJofAb6M4b9KoKWbjuvmF6kPpVP9` in project `prj_FDYkpssqLPLqHcJUdFHPrZnumHv4`; it is READY with no alias error.

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
Commit and push the canonical-domain migration, publish the matching Sites backend version, verify browser-origin POST behavior through Vercel, publish a new Skill patch release because its default endpoint changed, and smoke-test the homepage, catalog, download redirect, Skill manifest, and review redirect through the new domain.

Known risks:
The public URL layer depends on the existing Sites backend, so a Sites outage affects the Vercel URL. Sign in with ChatGPT still uses the legacy Sites origin. Seeded D1 rows keep stored legacy URLs until the backend update logic refreshes them; newly rendered metadata and Skill links already use the canonical Vercel address.
