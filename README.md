# SkinDex

Codex 口袋皮肤图鉴：聚合 Dream Skin 等完整皮肤与原生轻量配色，用 `$skindex` 发现、创作、投稿并逐步统一切换。

- 官网：<https://codex-skindex.vercel.app/>
- Skill 源码：[skill](skill)
- 产品框架：[docs/skindex-framework.md](docs/skindex-framework.md)

## 安装

在 Codex 新对话中发送：

```text
$skill-installer
请从 https://github.com/0xagata-prog/skindex/tree/v0.7.0/skill 安装官方 SkinDex Skill，并将它安装为 skindex。
```

安装完成后开启新对话：

```text
$skindex 帮我从官网挑一个低眩光主题。
$skindex 参考我发的图片生成一个原创主题。
```

也可以直接点击官网的“用 Codex 安装”。Skill 不需要额外的 GPT API Key。

## 产品边界

- 官网是完整皮肤/轻量配色的实时目录、审核和聚合入口；GitHub 是 Skill 的唯一源码和版本源。
- 主题导入先验证来源和兼容性，创建恢复点，复制设置并打开 Codex；最终外观修改仍由用户确认一次。
- Codex Dream Skin 是当前完整皮肤核心运行基座；v0.7 已为 macOS 上的审核预设接入固定版本安装、切换和恢复，安装第三方运行时与应用皮肤仍分别确认。
- 生成主题默认只保存在本地；明确确认后才进入私有审核队列，审核通过才公开。
- 插件版等正式上架后再开放，当前只分发独立 Skill。

## 主题上架标准

社区、商家、合作方和 SkinDex Lab 主题统一使用同一套固定卡片与分页规则，详见 [主题上架标准](docs/theme-publishing-standard.md)。

## 开发

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
npm test
npm run test:skindex
```

推送 `v*` 标签后，GitHub Actions 会把 [skill](skill) 打包为 `skindex-skill.zip` 并创建 Release。

## 许可与安全

项目代码采用 [Apache-2.0](LICENSE) 许可；第三方主题、预览和角色素材继续遵循各自来源声明，不自动转为 Apache-2.0。安全问题请使用 GitHub 仓库的私密 **Security → Report a vulnerability** 渠道，具体范围见 [.github/SECURITY.md](.github/SECURITY.md)。
