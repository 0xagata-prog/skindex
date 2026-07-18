import { env } from "cloudflare:workers";

type R2Like = {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export function getThemeAssets(): R2Like {
  const bucket = (env as unknown as { THEME_ASSETS?: R2Like }).THEME_ASSETS;
  if (!bucket) throw new Error("Cloudflare R2 binding `THEME_ASSETS` is unavailable.");
  return bucket;
}
