Goal:
Build and publish Codex Theme Hub, an aggregated gallery for Codex Desktop and CLI themes.

Current state:
The community-market site uses a durable D1 catalog with 13 verified theme records from three public GitHub sources, serves them from `/api/themes`, renders original repository previews, and stores anonymous GitHub-repository submissions in a pending moderation queue through `/api/submissions`. Local favorites remain device-only. Every theme now has a source-accurate use flow: native `codex-theme-v1` settings can be copied for import, `.codexskin` files download directly from the verified release, and Codex Styler themes link to the macOS/Windows installers. The site is public at https://codex-theme-hub-cn.jyyang040703.chatgpt.site and no longer has a ChatGPT access gate. `npm run lint`, `npm run build`, public API access, release download redirects, and generated social metadata all pass.

Files touched or relevant:
app/page.tsx
app/globals.css
app/layout.tsx
public/og.png
app/api/themes/route.ts
app/api/submissions/route.ts
db/index.ts
db/schema.ts
lib/theme-seed.ts
drizzle/0000_grey_tarantula.sql
package.json
package-lock.json
.openai/hosting.json

Important decisions:
Keep the existing bright community-market design. Use D1 for structured catalog and moderation data. Store only public metadata and links; do not rehost authors' theme files, preview assets, or installers. Public browsing and first-pass submissions do not require GPT/ChatGPT login. Browser security prevents truly silent one-click modification of Codex, so the product gives the shortest safe, real workflow for each upstream format. GitHub OAuth is deferred until ownership/maintainer workflows are designed.

What to do next:
Next product work should add a moderator interface, live GitHub metadata and release refresh, ownership verification, and optional GitHub login for maintainers. Consider an official custom URL scheme only if Codex or a trusted installer later exposes one.

Known risks:
Anonymous submissions can attract spam despite same-origin checks and a honeypot. GitHub stars are seeded snapshots rather than live-synced values. Preview hotlinks can break when upstream repositories move assets. There is no moderator UI yet; pending submissions must be reviewed through the data layer.
