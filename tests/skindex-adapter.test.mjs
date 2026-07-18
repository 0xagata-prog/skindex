import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { matchesImageSignature } from "../lib/image-security.ts";
import { getThemeInstallability } from "../lib/theme-capability.ts";
import { isTrustedBrowserOrigin } from "../lib/trusted-origin.ts";

import {
  confirmTransaction,
  catalogThemes,
  createLocalManifest,
  planManifest,
  readStatus,
  restorePlan,
  stageManifest,
  submitThemeProposal,
  validateManifest,
} from "../skill/scripts/skindex.mjs";

const samplePath = new URL("../catalog/chalkboard-green.json", import.meta.url);

async function sampleManifest() {
  return JSON.parse(await readFile(samplePath, "utf8"));
}

test("validates and plans a native data-only theme", async () => {
  const manifest = await sampleManifest();
  assert.deepEqual(validateManifest(manifest), { ok: true, errors: [], warnings: [] });
  const plan = planManifest(manifest, { stateRoot: "/tmp/skindex-test", platform: "darwin" });
  assert.equal(plan.status, "ready");
  assert.equal(plan.adapter, "codex-native-v1");
  assert.equal(plan.currentOs, "macos");
  assert.equal(plan.mutatesCodexBundle, false);
});

test("validates every bundled SkinDex catalog manifest", async () => {
  const catalogUrl = new URL("../catalog/", import.meta.url);
  const manifests = (await readdir(catalogUrl)).filter((name) => name.endsWith(".json"));
  assert.ok(manifests.length >= 2);
  for (const filename of manifests) {
    const manifest = JSON.parse(await readFile(new URL(filename, catalogUrl), "utf8"));
    assert.deepEqual(validateManifest(manifest), { ok: true, errors: [], warnings: [] }, filename);
  }
});

test("rejects executable manifest fields", async () => {
  const manifest = await sampleManifest();
  manifest.install.commands = ["open -a Codex"];
  const result = validateManifest(manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /forbidden executable fields/);
});

test("rejects fields outside the v1 schema", async () => {
  const manifest = await sampleManifest();
  manifest.postInstall = "do something surprising";
  const result = validateManifest(manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /unknown fields/);
});

test("reports operating-system incompatibility before staging", async () => {
  const manifest = await sampleManifest();
  manifest.compatibility.os = ["windows"];
  const plan = planManifest(manifest, { stateRoot: "/tmp/skindex-test", platform: "darwin" });
  assert.equal(plan.status, "incompatible");
  assert.equal(plan.compatible, false);
});

test("stages, confirms, and resolves a restore point in managed storage", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "skindex-test-"));
  const first = await sampleManifest();
  const firstStage = await stageManifest(first, { stateRoot });
  assert.equal(firstStage.status, "ready-for-confirmation");
  assert.match(await readFile(firstStage.payloadPath, "utf8"), /^codex-theme-v1:/);
  await confirmTransaction(firstStage.transactionId, { stateRoot });

  const second = structuredClone(first);
  second.id = "chalkboard-green-alt";
  second.name = "Chalkboard Green Alt";
  second.package.inline = second.package.inline.replace("#18382B", "#10261E");
  const secondStage = await stageManifest(second, { stateRoot });
  await confirmTransaction(secondStage.transactionId, { stateRoot });

  const status = await readStatus({ stateRoot });
  assert.equal(status.active.themeId, "chalkboard-green-alt");
  const restore = await restorePlan(secondStage.transactionId, { stateRoot });
  assert.equal(restore.nextAction, "codex-native-import");
  assert.equal(restore.themeId, "chalkboard-green");
  assert.match(await readFile(restore.payloadPath, "utf8"), /#18382B/);
});

test("uses the official default when no prior SkinDex theme exists", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "skindex-test-"));
  const staged = await stageManifest(await sampleManifest(), { stateRoot });
  const restore = await restorePlan(staged.transactionId, { stateRoot });
  assert.equal(restore.nextAction, "select-codex-default");
});

test("creates a valid local theme manifest from generated colors", () => {
  const manifest = createLocalManifest({
    id: "generated-ocean",
    name: "Generated Ocean",
    author: "Theme Maker",
    surface: "#EAF6FF",
    ink: "#18356A",
    accent: "#1674D1",
    mode: "light",
    now: () => new Date("2026-07-18T00:00:00Z"),
  });
  assert.deepEqual(validateManifest(manifest), { ok: true, errors: [], warnings: [] });
  assert.match(manifest.package.inline, /"variant":"light"/);
});

test("queries the live catalog shape without inventing install support", async () => {
  const fetchImpl = async () => Response.json({ themes: [
    { id: "native-blue", name: "Native Blue", description: "calm blue", mode: "浅色", platform: "桌面端", tags: ["蓝色"], verifiedVersion: "codex-theme-v1", sourceName: "Lab", install: { supportLevel: "native", action: "guided-import" } },
    { id: "pet-scene", name: "Pet Scene", description: "animated pet", mode: "深色", platform: "桌面端", tags: ["伙伴"], verifiedVersion: "preview-only", sourceName: "Community", install: { supportLevel: "adapter-pending", action: "view-source" } },
  ] });
  const result = await catalogThemes({ query: "blue", fetchImpl });
  assert.equal(result.total, 1);
  assert.equal(result.themes[0].id, "native-blue");
  assert.equal(result.themes[0].nativeImport, true);
  assert.deepEqual(result.themes[0].install, { supportLevel: "native", action: "guided-import" });
});

test("classifies catalog actions by verified adapter support", () => {
  assert.deepEqual(getThemeInstallability({ sourceRepo: "robinli/codex-material-themes", verifiedVersion: "codex-theme-v1" }), {
    supportLevel: "native",
    adapter: "codex-native-v1",
    action: "guided-import",
    requiresUserConfirmation: true,
    rollback: "restore-point",
  });
  assert.equal(getThemeInstallability({ sourceRepo: "skindex/lab", verifiedVersion: "codex-theme-v1" }).supportLevel, "partial");
  assert.equal(getThemeInstallability({ sourceRepo: "Wangnov/awesome-codex-skins", verifiedVersion: "codexskin-v1" }).action, "view-source");
});

test("refuses generated-theme upload without explicit consent", async () => {
  await assert.rejects(
    submitThemeProposal({
      name: "Private Theme",
      author: "Theme Maker",
      platform: "桌面端",
      palette: "#111111,#EEEEEE,#635BFF",
      previewPath: "/does/not/matter.png",
      consent: "no",
    }),
    /explicit --consent yes/,
  );
});

test("verifies declared image types by file signature", () => {
  assert.equal(matchesImageSignature("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(matchesImageSignature("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), true);
  assert.equal(matchesImageSignature("image/png", new TextEncoder().encode("<script>alert(1)</script>")), false);
});

test("marks consented proposal requests as SkinDex Skill traffic", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "skindex-submit-test-"));
  const previewPath = path.join(stateRoot, "preview.png");
  await writeFile(previewPath, Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  let clientHeader = "";
  const result = await submitThemeProposal({
    name: "Safe Preview",
    author: "Theme Maker",
    platform: "桌面端",
    palette: "#111111,#EEEEEE,#635BFF",
    previewPath,
    consent: "yes",
    fetchImpl: async (_url, init) => {
      clientHeader = init.headers["X-SkinDex-Client"];
      return Response.json({ proposal: { id: "proposal-id", status: "pending" } }, { status: 201 });
    },
  });
  assert.equal(clientHeader, "skindex-skill-v1");
  assert.equal(result.status, "pending");
  assert.equal(result.public, false);
  assert.equal(result.publication, "review-required");
});

test("trusts the canonical Vercel origin without opening arbitrary cross-site posts", () => {
  assert.equal(isTrustedBrowserOrigin(new Request("https://codex-theme-hub-cn.jyyang040703.chatgpt.site/api/submissions", {
    headers: { Origin: "https://codex-skindex.vercel.app" },
  })), true);
  assert.equal(isTrustedBrowserOrigin(new Request("https://codex-theme-hub-cn.jyyang040703.chatgpt.site/api/submissions", {
    headers: { Origin: "https://attacker.example" },
  })), false);
});
