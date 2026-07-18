export function GET() {
  return Response.json(
    {
      error: "插件预览包已撤回，请改用独立 SkinDex Skill；插件将在正式上架后重新开放。",
      skillUrl: "https://github.com/0xagata-prog/skindex/tree/v0.5.1/skill",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
