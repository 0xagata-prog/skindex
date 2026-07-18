const publicOrigins = new Set([
  "https://codex-skindex.vercel.app",
  "https://codex-theme-hub-cn.jyyang040703.chatgpt.site",
]);

export function isTrustedBrowserOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin || publicOrigins.has(origin);
}
