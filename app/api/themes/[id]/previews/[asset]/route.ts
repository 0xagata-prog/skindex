import { getThemeAssets } from "../../../../../../storage";

type RouteContext = { params: Promise<{ id: string; asset: string }> };

const safeId = /^[a-z0-9][a-z0-9._-]{1,127}$/i;
const safeAsset = /^[0-9a-f-]{36}\.(png|jpg|webp)$/i;

export async function GET(_request: Request, context: RouteContext) {
  const { id, asset } = await context.params;
  if (!safeId.test(id) || !safeAsset.test(asset)) return new Response("Not found", { status: 404 });
  const object = await getThemeAssets().get(`managed-themes/${id}/${asset}`);
  if (!object) return new Response("Not found", { status: 404 });
  const extension = asset.split(".").pop()?.toLowerCase();
  const contentType = extension === "jpg" ? "image/jpeg" : extension === "webp" ? "image/webp" : "image/png";
  return new Response(await object.arrayBuffer(), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
