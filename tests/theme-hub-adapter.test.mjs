import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  confirmTransaction,
  planManifest,
  readStatus,
  restorePlan,
  stageManifest,
  validateManifest,
} from "../plugins/codex-theme-hub/skills/theme-hub/scripts/theme-hub.mjs";

const samplePath = new URL("../plugins/codex-theme-hub/catalog/chalkboard-green.json", import.meta.url);

async function sampleManifest() {
  return JSON.parse(await readFile(samplePath, "utf8"));
}

test("validates and plans a native data-only theme", async () => {
  const manifest = await sampleManifest();
  assert.deepEqual(validateManifest(manifest), { ok: true, errors: [], warnings: [] });
  const plan = planManifest(manifest, { stateRoot: "/tmp/theme-hub-test", platform: "darwin" });
  assert.equal(plan.status, "ready");
  assert.equal(plan.adapter, "codex-native-v1");
  assert.equal(plan.currentOs, "macos");
  assert.equal(plan.mutatesCodexBundle, false);
});

test("validates every bundled Theme Hub catalog manifest", async () => {
  const catalogUrl = new URL("../plugins/codex-theme-hub/catalog/", import.meta.url);
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
  const plan = planManifest(manifest, { stateRoot: "/tmp/theme-hub-test", platform: "darwin" });
  assert.equal(plan.status, "incompatible");
  assert.equal(plan.compatible, false);
});

test("stages, confirms, and resolves a restore point in managed storage", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "codex-theme-hub-test-"));
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

test("uses the official default when no prior Theme Hub theme exists", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "codex-theme-hub-test-"));
  const staged = await stageManifest(await sampleManifest(), { stateRoot });
  const restore = await restorePlan(staged.transactionId, { stateRoot });
  assert.equal(restore.nextAction, "select-codex-default");
});
