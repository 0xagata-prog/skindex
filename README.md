# Codex Theme Hub

Codex 主题与皮肤聚合目录，以及当前可独立安装的 `$theme-hub` 对话 Skill。

公开站点：<https://codex-theme-hub-cn.jyyang040703.chatgpt.site/>

GitHub 源码：<https://github.com/0xagata-prog/codex-theme-hub>

最新 Skill：<https://github.com/0xagata-prog/codex-theme-hub/releases/latest/download/theme-hub-skill.zip>

## 当前能力

- D1 真实主题目录、GitHub 投稿队列与 Skill 生成主题审核队列。
- R2 保存用户明确同意上传的生成主题预览；未确认内容只留在本地。
- 统一的 `Theme Manifest v1` 数据契约。
- GitHub 是 Skill 源码和版本的唯一发布源；官网安装按钮指向最新 GitHub Release。
- `codex-theme-v1` 的校验、托管暂存、恢复点与剪贴板适配器。
- 官网目录查询、逐主题 Manifest API、参考图生成流程与经确认提交审核。
- 官网到 Codex 的 `$theme-hub` 对话深链；链接只预填对话，不会绕过用户确认。

产品框架见 [docs/theme-hub-framework.md](docs/theme-hub-framework.md)。Skill 源码位于 [plugins/codex-theme-hub/skills/theme-hub](plugins/codex-theme-hub/skills/theme-hub)。

## Skill 安装

从 [GitHub Releases](https://github.com/0xagata-prog/codex-theme-hub/releases) 下载 `theme-hub-skill.zip`，解压后把完整的 `theme-hub` 文件夹放进用户 Skill 目录：

```text
macOS / Linux: ~/.agents/skills/theme-hub/SKILL.md
Windows: %USERPROFILE%\.agents\skills\theme-hub\SKILL.md
```

重启 Codex 或开始新对话后，可以直接说：

```text
$theme-hub 帮我从官网挑一个低眩光主题。
$theme-hub 参考我发的图片生成一个原创主题。
```

当前 Skill 不需要单独连接 GPT API。`.codexskin` 与 Codex Styler 适配器尚未开放；它们只展示可追溯来源，不作为一键安装入口。

## 发布 Skill

GitHub 是唯一发布源。推送 `v*` 版本标签后，[Release Skill 工作流](.github/workflows/release-skill.yml) 会从 `plugins/codex-theme-hub/skills/theme-hub` 重新打包并创建或更新同名 Release。

## 网站开发

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
