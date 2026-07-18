# Codex Theme Hub 产品框架

## 产品分工

- 官网负责发现、筛选、预览、收藏与可信来源说明。
- Codex 插件负责理解用户意图、校验 Manifest、托管主题文件、生成恢复点并调用适配器。
- 适配器负责把统一 Manifest 转换成某种上游主题格式的安全操作。
- Theme Hub 不要求用户理解 App Manager、下载目录或各个上游项目的安装差异。

## 主流程

```text
主题卡片
  → codex://new?prompt=<encoded>
  → 用户发送预填请求
  → Codex Theme Hub 插件
  → Manifest v1 校验
  → 托管存储 + 恢复点
  → 格式适配器
  → 用户确认 Codex 外观变更
```

官方深链只负责打开 Codex并预填内容，不会自动发送。第一次使用还要求 Codex 已知 Theme Hub Marketplace；公开 Marketplace 未完成前，不替换线上按钮。

## v0.1 范围

- 完成 `Theme Manifest v1`。
- 完成 `codex-theme-v1 → codex-native-v1` 的校验、托管暂存、剪贴板准备与恢复点。
- 识别 `.codexskin` 和 Codex Styler，但暂不自动执行。
- 不修改 Codex 应用包，不启用调试端口，不执行主题仓库提供的命令。

## 后续里程碑

1. 将站点目录转换为逐主题 Manifest API，并为远程包补齐 SHA-256。
2. 发布 Theme Hub Marketplace，让插件 mention 可安装。
3. 将官网按钮切换为“在 Codex 中使用”，保留无法安装插件时的降级流程。
4. 将 `.codexskin` 与 Styler 能力封装为内部适配器，并完成跨平台恢复测试。
