# Website to Codex deep link v1

Use an explicit Skill invocation followed by a small structured request:

```text
$skindex
安装官网主题“Chalkboard Green”。
skindex_request={"version":"1","action":"install","themeId":"chalkboard-green","manifestUrl":"https://codex-skindex.vercel.app/api/themes?format=manifest&id=chalkboard-green","themeRevision":"2026-07-18","clipboardPrepared":true}
```

Generate the URL in the browser with:

```js
const url = `codex://new?prompt=${encodeURIComponent(prompt)}`;
```

The deep link opens a new local Codex chat and pre-fills the composer. It does not send automatically. Keep the visible prompt this short: the Skill itself owns validation, recovery points, confirmation, and failure safety. The user sending the prompt is the install intent boundary.

On a direct theme click, the HTTPS website uses that user gesture to copy the native payload before opening Codex and sets the boolean `clipboardPrepared` hint plus the catalog `themeRevision`. The Skill must still fetch and validate the exact official Manifest, and the revision must match, before using the hint. After staging, it opens the official `codex://settings` route. Codex does not currently expose a theme-install deep link, so the user still completes the native **Appearance → Import** confirmation. Never put the payload in the website prompt or normal Skill response.

Only accept a `manifestUrl` on the exact official origin `https://codex-skindex.vercel.app`, with `/api/themes`, `format=manifest`, and an `id` equal to `themeId`. Accept `clipboardPrepared` only when it is a boolean and `themeRevision` exactly matches the validated Manifest `updatedAt`; use it only as a UX hint. If any URL part differs, ignore the URL and fetch the official catalog entry by ID. Custom endpoints are for explicit testing only.

The standalone `skindex` Skill must already exist in the user's Skill directory. A deep link never installs the Skill; if `$skindex` is unavailable, direct the user to the website installation flow. Plugin distribution remains deferred until a public listing exists.

## Installer handoff

The website may open a separate Codex task that invokes the built-in `$skill-installer` with the official GitHub `skill/` path. That prompt must not invoke `$skindex`, because the Skill is not installed yet. Treat this as guided installation, not silent one-click installation.

Do not add a local filesystem `path` to a public website link. Do not put package bytes, secrets, arbitrary instructions, or executable commands in the prompt.
