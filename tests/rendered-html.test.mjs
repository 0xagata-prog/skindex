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
  assert.match(page, /skillSourceUrl = `\$\{githubRepoUrl\}\/tree\/main\/skill`/);
  assert.match(page, /用 Codex 安装/);
  assert.doesNotMatch(page, /目标目录/);
  assert.doesNotMatch(page, /手动下载 Skill/);
  assert.match(skillRedirect, /Response\.redirect\(releaseUrl, 307\)/);
  assert.match(legacyRedirect, /downloads\/skindex-skill\.zip/);
  assert.match(pluginRetirement, /status: 410/);
  assert.doesNotMatch(page, /codex plugin marketplace add/);
});

test("routes theme actions through declared support levels", async () => {
  const [page, themesRoute, capability, skill] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/api/themes/route.ts"),
    source("../lib/theme-capability.ts"),
    source("../skill/SKILL.md"),
  ]);

  assert.match(themesRoute, /install: getThemeInstallability\(theme\)/);
  assert.match(capability, /"native" \| "partial" \| "adapter-pending"/);
  assert.match(capability, /action: "guided-import"/);
  assert.match(capability, /action: "view-source"/);
  assert.match(page, /requestThemeUse\(theme\)/);
  assert.doesNotMatch(page, /href=\{themeUseChatUrl\(theme\)\}/);
  assert.match(page, /skindex_request=/);
  assert.match(page, /适配器开发中/);
  assert.match(skill, /`verified`, `staged`, `awaiting-confirmation`, or `confirmed`/);
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
