# Website to Codex deep link v1

Use a plugin mention followed by a small structured request:

```text
[@Codex Theme Hub](plugin://codex-theme-hub@codex-theme-hub)
请安装并应用我选择的主题。
theme_hub_request={"version":"1","action":"install","themeId":"chalkboard-green","manifestUrl":"https://example.com/themes/chalkboard-green.json"}
要求：验证兼容性与完整性，创建恢复点，失败时不要改变当前主题。
```

Generate the URL in the browser with:

```js
const url = `codex://new?prompt=${encodeURIComponent(prompt)}`;
```

The deep link opens a new local Codex chat and pre-fills the composer. It does not send automatically. The user sending the prompt is the install intent boundary.

The plugin mention can trigger installation only when the `codex-theme-hub` marketplace is already known to Codex and workspace policy allows it. Until the public marketplace is distributed, keep website buttons on the existing flow.

Do not add a local filesystem `path` to a public website link. Do not put package bytes, secrets, arbitrary instructions, or executable commands in the prompt.
