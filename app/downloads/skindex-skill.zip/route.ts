const releaseUrl = "https://github.com/0xagata-prog/skindex/releases/latest/download/skindex-skill.zip";

export function GET() {
  return Response.redirect(releaseUrl, 307);
}
