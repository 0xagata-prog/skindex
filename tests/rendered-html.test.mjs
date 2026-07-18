import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("keeps guided installation in Codex with GitHub as the fallback source", async () => {
  const [page, skillRedirect, pluginRetirement] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/downloads/theme-hub-skill.zip/route.ts"),
    source("../app/downloads/codex-theme-hub-plugin.zip/route.ts"),
  ]);

  assert.match(page, /function skillInstallerChatUrl\(\)/);
  assert.match(page, /在 Codex 中开始安装/);
  assert.match(page, /等待我确认后再安装/);
  assert.match(page, /\$HOME\/\.agents\/skills\/theme-hub/);
  assert.match(page, /releases\/latest\/download\/theme-hub-skill\.zip/);
  assert.match(skillRedirect, /Response\.redirect\(releaseUrl, 307\)/);
  assert.match(pluginRetirement, /status: 410/);
  assert.doesNotMatch(page, /codex plugin marketplace add/);
});

test("routes theme actions through declared support levels", async () => {
  const [page, themesRoute, capability, skill] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/api/themes/route.ts"),
    source("../lib/theme-capability.ts"),
    source("../plugins/codex-theme-hub/skills/theme-hub/SKILL.md"),
  ]);

  assert.match(themesRoute, /install: getThemeInstallability\(theme\)/);
  assert.match(capability, /"native" \| "partial" \| "adapter-pending"/);
  assert.match(capability, /action: "guided-import"/);
  assert.match(capability, /action: "view-source"/);
  assert.match(page, /href=\{themeUseChatUrl\(theme\)\}/);
  assert.match(page, /theme_hub_request=/);
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
    source("../plugins/codex-theme-hub/skills/theme-hub/SKILL.md"),
    source("../plugins/codex-theme-hub/skills/theme-hub/scripts/theme-hub.mjs"),
  ]);

  assert.match(page, /publicationConsent/);
  assert.match(page, /审核通过前不会出现在官网/);
  assert.match(submissionsRoute, /status: PENDING_REVIEW_STATUS/);
  assert.match(proposalsRoute, /status: PENDING_REVIEW_STATUS/);
  assert.match(policy, /public: false/);
  assert.match(policy, /status === APPROVED_THEME_STATUS/);
  assert.match(themesRoute, /isPublicThemeStatus\(theme\.status\)/);
  assert.match(themesRoute, /eq\(themes\.status, APPROVED_THEME_STATUS\)/);
  assert.match(skill, /这个主题已经保存在本地，要不要投稿到 Theme Hub 官网/);
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
  assert.match(reviewAuth, /THEME_HUB_REVIEWER_EMAIL/);
  assert.match(reviewAuth, /getAuthorizedReviewer/);
  assert.match(reviewAction, /getAuthorizedReviewer\(\)/);
  assert.match(reviewAction, /origin !== new URL\(request\.url\)\.origin/);
  assert.match(reviewAction, /status: APPROVED_THEME_STATUS/);
  assert.match(reviewAction, /curation-required/);
  assert.match(privatePreview, /getAuthorizedReviewer\(\)/);
  assert.match(privatePreview, /Cache-Control": "private, no-store"/);
  assert.match(publicPreview, /eq\(themeProposals\.status, APPROVED_THEME_STATUS\)/);
});
