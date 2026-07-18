import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("uses Codex Skill Installer with GitHub as the canonical source", async () => {
  const [page, skillRedirect, legacyRedirect, pluginRetirement] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/downloads/skindex-skill.zip/route.ts"),
    source("../app/downloads/theme-hub-skill.zip/route.ts"),
    source("../app/downloads/codex-theme-hub-plugin.zip/route.ts"),
  ]);

  assert.match(page, /function skillInstallerChatUrl\(\)/);
  assert.match(page, /SKINDEX_SKILL_READY_KEY/);
  assert.match(page, /还没安装：安装 SkinDex/);
  assert.match(page, /我已安装：在 Codex 中打开主题/);
  assert.match(page, /若不存在，立即停止/);
  assert.match(page, /不要读取项目文件，不要搜索网页/);
  assert.match(page, /\$skill-installer/);
  assert.match(page, /github\.com\/0xagata-prog\/skindex/);
  assert.match(page, /skillSourceUrl = `\$\{githubRepoUrl\}\/tree\/v0\.5\.0\/skill`/);
  assert.match(page, /用 Codex 安装/);
  assert.doesNotMatch(page, /目标目录/);
  assert.doesNotMatch(page, /手动下载 Skill/);
  assert.match(skillRedirect, /Response\.redirect\(releaseUrl, 307\)/);
  assert.match(legacyRedirect, /new URL\("\/downloads\/skindex-skill\.zip", request\.url\)/);
  assert.match(pluginRetirement, /status: 410/);
  assert.doesNotMatch(page, /codex plugin marketplace add/);
});

test("routes theme actions through declared support levels", async () => {
  const [page, themesRoute, capability, skill, styles] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/api/themes/route.ts"),
    source("../lib/theme-capability.ts"),
    source("../skill/SKILL.md"),
    source("../app/globals.css"),
  ]);

  assert.match(themesRoute, /install: getThemeInstallability\(theme\)/);
  assert.match(capability, /"native" \| "partial" \| "adapter-pending"/);
  assert.match(capability, /action: "guided-import"/);
  assert.match(capability, /action: "view-source"/);
  assert.match(page, /requestThemeUse\(selected\)/);
  assert.match(page, /openInstall\(selected\)/);
  assert.match(page, /打开主题/);
  assert.doesNotMatch(page, /href=\{themeUseChatUrl\(theme\)\}/);
  assert.match(page, /skindex_request=/);
  assert.match(page, /暂不支持导入/);
  assert.doesNotMatch(page, /查看兼容状态/);
  assert.match(page, /theme-status-pill/);
  assert.doesNotMatch(page, /className=\{`compatibility/);
  assert.match(styles, /\.theme-card \{[^}]*height: 100%;[^}]*display: flex;/);
  assert.match(styles, /\.card-body \{[^}]*flex: 1;[^}]*display: flex;/);
  assert.match(styles, /\.use-now-button \{[^}]*margin: auto 0 14px;/);
  assert.match(skill, /`verified`, `staged`, `awaiting-confirmation`, or `confirmed`/);
});

test("paginates the catalog on the server and fixes the publishing format", async () => {
  const [page, themesRoute, proposalRoute, submissionRoute, reviewRoute, standard, pagination, styles] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/api/themes/route.ts"),
    source("../app/api/theme-proposals/route.ts"),
    source("../app/api/submissions/route.ts"),
    source("../app/api/review/[kind]/[id]/route.ts"),
    source("../lib/theme-standard.ts"),
    source("../lib/theme-pagination.ts"),
    source("../app/globals.css"),
  ]);

  assert.match(pagination, /THEME_CATALOG_PAGE_SIZE = 24/);
  assert.match(themesRoute, /\.limit\(pagination\.pageSize\)/);
  assert.match(themesRoute, /\.offset\(pagination\.offset\)/);
  assert.match(themesRoute, /countDistinct\(themes\.sourceRepo\)/);
  assert.match(themesRoute, /catalogFilter\(filter\)/);
  assert.match(page, /catalog-pagination/);
  assert.match(page, /window\.history\.replaceState/);
  assert.match(page, /第 \{pagination\.page\} \/ \{pagination\.totalPages\} 页/);
  assert.match(styles, /\.catalog-pagination \.page-numbers \{ display: none; \}/);
  assert.match(standard, /nameMax: 64/);
  assert.match(standard, /descriptionMax: 180/);
  assert.match(standard, /tagMax: 4/);
  assert.match(proposalRoute, /validateThemePreviewDimensions/);
  assert.match(submissionRoute, /validateThemeIdentity/);
  assert.match(reviewRoute, /normalizeCatalogDescription/);
  assert.match(reviewRoute, /normalizeCatalogTags/);
});

test("keeps every submission private until review approval", async () => {
  const [page, submissionsRoute, proposalsRoute, themesRoute, policy, skill, script] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/api/submissions/route.ts"),
    source("../app/api/theme-proposals/route.ts"),
    source("../app/api/themes/route.ts"),
    source("../lib/review-policy.ts"),
    source("../skill/SKILL.md"),
    source("../skill/scripts/skindex.mjs"),
  ]);

  assert.match(page, /publicationConsent/);
  assert.match(page, /审核通过前不会出现在官网/);
  assert.match(submissionsRoute, /status: PENDING_REVIEW_STATUS/);
  assert.match(proposalsRoute, /status: PENDING_REVIEW_STATUS/);
  assert.match(policy, /public: false/);
  assert.match(policy, /status === APPROVED_THEME_STATUS/);
  assert.match(themesRoute, /isPublicThemeStatus\(theme\.status\)/);
  assert.match(themesRoute, /eq\(themes\.status, APPROVED_THEME_STATUS\)/);
  assert.match(skill, /这个主题已经保存在本地，要不要投稿到 SkinDex 官网/);
  assert.match(skill, /this first yes is interest, not upload consent/);
  assert.match(script, /publication: "review-required"/);
});

test("bounds public submission queues and removes rejected previews", async () => {
  const [proposalRoute, submissionRoute, guard, reviewAction, reviewPage] = await Promise.all([
    source("../app/api/theme-proposals/route.ts"),
    source("../app/api/submissions/route.ts"),
    source("../lib/submission-guard.ts"),
    source("../app/api/review/[kind]/[id]/route.ts"),
    source("../app/review/page.tsx"),
  ]);
  assert.match(proposalRoute, /submissionCapacity\("proposal"\)/);
  assert.match(submissionRoute, /submissionCapacity\("repository"\)/);
  assert.match(guard, /status: 429/);
  assert.match(guard, /Retry-After/);
  assert.match(reviewAction, /getThemeAssets\(\)\.delete\(proposal\.previewKey\)/);
  assert.match(reviewPage, /\.limit\(101\)/);
});

test("protects the owner-only review surface on every server boundary", async () => {
  const [reviewPage, reviewAuth, reviewAction, privatePreview, publicPreview] = await Promise.all([
    source("../app/review/page.tsx"),
    source("../lib/reviewer-auth.ts"),
    source("../app/api/review/[kind]/[id]/route.ts"),
    source("../app/api/review/proposals/[id]/preview/route.ts"),
    source("../app/api/theme-proposals/[id]/preview/route.ts"),
  ]);

  assert.match(reviewPage, /requireChatGPTUser\("\/review"\)/);
  assert.match(reviewPage, /isConfiguredReviewer\(user\)/);
  assert.match(reviewAuth, /SKINDEX_REVIEWER_EMAIL/);
  assert.match(reviewAuth, /getAuthorizedReviewer/);
  assert.match(reviewAction, /getAuthorizedReviewer\(\)/);
  assert.match(reviewAction, /origin !== new URL\(request\.url\)\.origin/);
  assert.match(reviewAction, /status: APPROVED_THEME_STATUS/);
  assert.match(reviewAction, /curation-required/);
  assert.match(privatePreview, /getAuthorizedReviewer\(\)/);
  assert.match(privatePreview, /Cache-Control": "private, no-store"/);
  assert.match(publicPreview, /eq\(themeProposals\.status, APPROVED_THEME_STATUS\)/);
});

test("manages published themes with owner-only revisions and reversible unpublishing", async () => {
  const [reviewPage, themesPage, manager, adminRoute, previewRoute, publicPreview, schema, seed, store] = await Promise.all([
    source("../app/review/page.tsx"),
    source("../app/review/themes/page.tsx"),
    source("../app/review/themes/theme-manager.tsx"),
    source("../app/api/review/themes/[id]/route.ts"),
    source("../app/api/review/themes/[id]/preview/route.ts"),
    source("../app/api/themes/[id]/previews/[asset]/route.ts"),
    source("../db/schema.ts"),
    source("../lib/theme-seed.ts"),
    source("../lib/theme-admin-store.ts"),
  ]);
  assert.match(reviewPage, /href="\/review\/themes"/);
  assert.match(themesPage, /requireChatGPTUser\("\/review\/themes"\)/);
  assert.match(themesPage, /isConfiguredReviewer\(user\)/);
  assert.match(themesPage, /\.limit\(pageSize\)\.offset/);
  assert.match(manager, /编辑主题资料/);
  assert.match(manager, /替换预览图/);
  assert.match(manager, /版本历史/);
  assert.match(adminRoute, /getAuthorizedReviewer\(\)/);
  assert.match(adminRoute, /跨站主题管理请求已拒绝/);
  assert.match(adminRoute, /action: `restore:\$\{revision\.id\}`/);
  assert.match(previewRoute, /inspectImageUpload/);
  assert.match(previewRoute, /validateThemePreviewDimensions/);
  assert.match(publicPreview, /max-age=31536000, immutable/);
  assert.match(schema, /themeRevisions/);
  assert.match(store, /INSERT INTO theme_revisions/);
  assert.match(store, /theme_override:/);
  assert.match(seed, /WHERE NOT EXISTS \(\s*SELECT 1 FROM catalog_meta WHERE key = 'theme_override:'/);
  assert.doesNotMatch(adminRoute, /DELETE FROM themes|\.delete\(themes\)/);
});

test("publishes SkinDex through a narrow Vercel proxy while Sites keeps the backend", async () => {
  const [proxy, page, skill, trustedOrigin] = await Promise.all([
    source("../vercel-proxy/vercel.json"),
    source("../app/page.tsx"),
    source("../skill/scripts/skindex.mjs"),
    source("../lib/trusted-origin.ts"),
  ]);

  assert.match(proxy, /codex-theme-hub-cn\.jyyang040703\.chatgpt\.site/);
  assert.match(proxy, /"source": "\/"/);
  assert.match(proxy, /"source": "\/:path\*"/);
  assert.match(page, /https:\/\/codex-skindex\.vercel\.app/);
  assert.match(skill, /https:\/\/codex-skindex\.vercel\.app/);
  assert.match(trustedOrigin, /https:\/\/codex-skindex\.vercel\.app/);
  assert.doesNotMatch(trustedOrigin, /vercel\.app\$|endsWith/);
  assert.match(proxy, /Content-Security-Policy/);
  assert.match(proxy, /X-Frame-Options/);
});

test("publishes legal, SEO, and canonical metadata without trusting forwarded hosts", async () => {
  const [layout, page, robots, sitemap, privacy, terms, support] = await Promise.all([
    source("../app/layout.tsx"),
    source("../app/page.tsx"),
    source("../app/robots.ts"),
    source("../app/sitemap.ts"),
    source("../app/privacy/page.tsx"),
    source("../app/terms/page.tsx"),
    source("../app/support/page.tsx"),
  ]);
  assert.match(layout, /const canonicalOrigin = "https:\/\/codex-skindex\.vercel\.app"/);
  assert.doesNotMatch(layout, /x-forwarded-host|headers\(\)/);
  assert.match(page, /href="\/privacy"/);
  assert.match(robots, /sitemap/);
  assert.match(sitemap, /\/support/);
  assert.match(privacy, /EXIF/);
  assert.match(terms, /不会静默修改 Codex/);
  assert.match(support, /GitHub Issues/);
});
