Goal:
Build and publish Codex Theme Hub, an aggregated gallery for Codex Desktop and CLI themes.

Current state:
The community-market site now uses a durable D1 catalog instead of demo theme state. It seeds 13 verified theme records from three public GitHub sources, serves them from `/api/themes`, renders original repository previews, and stores anonymous GitHub-repository submissions in a pending moderation queue through `/api/submissions`. Local favorites remain device-only. `npm run lint`, `npm run build`, the catalog API, and a D1 submission write all pass. The previous private Sites deployment is live at https://codex-theme-hub-cn.jyyang040703.chatgpt.site; the real-data version is ready to publish over it.

Files touched or relevant:
app/page.tsx
app/globals.css
app/layout.tsx
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
Keep the existing bright community-market design. Use D1 for structured catalog and moderation data. Store only public metadata and links; do not rehost authors' theme files or preview assets. Public browsing and first-pass submissions do not require GPT/ChatGPT login. GitHub OAuth is deferred until ownership/maintainer workflows are designed.

What to do next:
Publish the validated version. Next product work should add a moderator interface, live GitHub metadata refresh, ownership verification, and optional GitHub login for maintainers.

Known risks:
Anonymous submissions can attract spam despite same-origin checks and a honeypot. GitHub stars are seeded snapshots rather than live-synced values. Preview hotlinks can break when upstream repositories move assets. There is no moderator UI yet; pending submissions must be reviewed through the data layer.
