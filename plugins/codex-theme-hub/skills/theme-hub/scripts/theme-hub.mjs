#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const FORMAT_ADAPTERS = Object.freeze({
  "codex-theme-v1": "codex-native-v1",
  "codexskin-v1": "codexskin-runtime-v1",
  "codex-styler-theme-v1": "codex-styler-v1",
});

const AVAILABLE_ADAPTERS = new Set(["codex-native-v1"]);
const FORBIDDEN_KEYS = new Set([
  "command",
  "commands",
  "script",
  "scripts",
  "hook",
  "hooks",
  "executable",
  "exec",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHttps(value) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function findForbiddenKeys(value, location = "manifest", found = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenKeys(item, `${location}[${index}]`, found));
    return found;
  }
  if (!isObject(value)) return found;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) found.push(`${location}.${key}`);
    findForbiddenKeys(child, `${location}.${key}`, found);
  }
  return found;
}

function rejectUnknownKeys(value, allowed, location, errors) {
  if (!isObject(value)) return;
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) errors.push(`${location} contains unknown fields: ${unknown.join(", ")}`);
}

function validateNativePayload(payload, errors) {
  if (typeof payload !== "string" || !payload.startsWith("codex-theme-v1:")) {
    errors.push("package.inline must start with codex-theme-v1:");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(payload.slice("codex-theme-v1:".length));
  } catch {
    errors.push("package.inline contains invalid codex-theme-v1 JSON");
    return;
  }

  if (!isObject(parsed) || !isObject(parsed.theme)) {
    errors.push("native payload must contain a theme object");
    return;
  }
  if (typeof parsed.codeThemeId !== "string" || !parsed.codeThemeId.trim()) {
    errors.push("native payload must contain codeThemeId");
  }
  if (!new Set(["dark", "light"]).has(parsed.variant)) {
    errors.push("native payload variant must be dark or light");
  }
  for (const color of ["surface", "ink", "accent"]) {
    if (!/^#[0-9a-f]{6}$/i.test(parsed.theme[color] ?? "")) {
      errors.push(`native payload theme.${color} must be a six-digit hex color`);
    }
  }
}

export function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  if (!isObject(manifest)) return { ok: false, errors: ["manifest must be a JSON object"], warnings };

  const forbidden = findForbiddenKeys(manifest);
  if (forbidden.length) errors.push(`manifest contains forbidden executable fields: ${forbidden.join(", ")}`);

  rejectUnknownKeys(manifest, new Set([
    "schemaVersion",
    "id",
    "name",
    "summary",
    "author",
    "source",
    "compatibility",
    "preview",
    "package",
    "install",
    "updatedAt",
  ]), "manifest", errors);
  rejectUnknownKeys(manifest.author, new Set(["name", "url"]), "author", errors);
  rejectUnknownKeys(manifest.source, new Set(["repository", "revision", "license"]), "source", errors);
  rejectUnknownKeys(manifest.compatibility, new Set(["surfaces", "os", "codexBuild"]), "compatibility", errors);
  rejectUnknownKeys(manifest.compatibility?.codexBuild, new Set(["min", "max"]), "compatibility.codexBuild", errors);
  rejectUnknownKeys(manifest.preview, new Set(["imageUrl"]), "preview", errors);
  rejectUnknownKeys(manifest.package, new Set(["format", "inline", "url", "integrity"]), "package", errors);
  rejectUnknownKeys(manifest.package?.integrity, new Set(["algorithm", "value"]), "package.integrity", errors);
  rejectUnknownKeys(manifest.install, new Set(["adapter", "requiresUserConfirmation", "rollback"]), "install", errors);

  if (manifest.schemaVersion !== "theme-hub/v1") errors.push("schemaVersion must be theme-hub/v1");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id ?? "")) errors.push("id must be lowercase kebab-case");
  if (typeof manifest.name !== "string" || !manifest.name.trim()) errors.push("name is required");
  if (typeof manifest.summary !== "string" || !manifest.summary.trim()) errors.push("summary is required");

  if (!isObject(manifest.author) || typeof manifest.author.name !== "string" || !isHttps(manifest.author.url)) {
    errors.push("author.name and an HTTPS author.url are required");
  }
  if (!isObject(manifest.source) || !isHttps(manifest.source.repository)) {
    errors.push("source.repository must be HTTPS");
  }
  if (!isObject(manifest.source) || typeof manifest.source.revision !== "string" || !manifest.source.revision.trim()) {
    errors.push("source.revision is required");
  }
  if (!isObject(manifest.source) || typeof manifest.source.license !== "string" || !manifest.source.license.trim()) {
    errors.push("source.license is required");
  }

  const surfaces = manifest.compatibility?.surfaces;
  const systems = manifest.compatibility?.os;
  if (!Array.isArray(surfaces) || !surfaces.includes("codex-desktop")) {
    errors.push("compatibility.surfaces must include codex-desktop");
  }
  if (!Array.isArray(systems) || !systems.length || systems.some((item) => !["macos", "windows", "linux"].includes(item))) {
    errors.push("compatibility.os must contain supported operating systems");
  }
  if (!isHttps(manifest.preview?.imageUrl)) errors.push("preview.imageUrl must be HTTPS");

  const format = manifest.package?.format;
  const expectedAdapter = FORMAT_ADAPTERS[format];
  if (!expectedAdapter) errors.push("package.format is not recognized");
  if (manifest.install?.adapter !== expectedAdapter) {
    errors.push(`install.adapter must be ${expectedAdapter ?? "a recognized adapter"} for ${format ?? "this format"}`);
  }
  if (manifest.install?.requiresUserConfirmation !== true) {
    errors.push("install.requiresUserConfirmation must be true");
  }
  if (manifest.install?.rollback !== "restore-point") errors.push("install.rollback must be restore-point");

  if (format === "codex-theme-v1") {
    validateNativePayload(manifest.package?.inline, errors);
    if (manifest.package?.url) errors.push("codex-theme-v1 must use an inline data payload in v1");
  } else if (expectedAdapter) {
    if (!isHttps(manifest.package?.url)) errors.push("remote package URL must be HTTPS");
    const integrity = manifest.package?.integrity;
    if (integrity?.algorithm !== "sha256" || !/^[a-f0-9]{64}$/.test(integrity?.value ?? "")) {
      errors.push("remote packages require lowercase SHA-256 integrity");
    }
  }

  if (manifest.package?.integrity && typeof manifest.package?.inline === "string") {
    const actual = sha256(manifest.package.inline);
    if (manifest.package.integrity.algorithm !== "sha256" || manifest.package.integrity.value !== actual) {
      errors.push("inline package integrity does not match its SHA-256 digest");
    }
  }

  if (typeof manifest.updatedAt !== "string" || Number.isNaN(Date.parse(manifest.updatedAt))) {
    errors.push("updatedAt must be an ISO date-time");
  }
  if (expectedAdapter && !AVAILABLE_ADAPTERS.has(expectedAdapter)) {
    warnings.push(`${expectedAdapter} is recognized but unavailable in plugin v0.1.0`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function stateRootFromEnvironment({ platform = process.platform, env = process.env, home = homedir() } = {}) {
  if (env.CODEX_THEME_HUB_HOME) return path.resolve(env.CODEX_THEME_HUB_HOME);
  if (platform === "win32") {
    if (!env.LOCALAPPDATA) throw new Error("LOCALAPPDATA is required on Windows");
    return path.join(env.LOCALAPPDATA, "CodexThemeHub");
  }
  return path.join(home, ".codex-theme-hub");
}

async function loadManifest(manifestPath) {
  const text = await readFile(path.resolve(manifestPath), "utf8");
  return { manifest: JSON.parse(text), text };
}

function assertValid(manifest) {
  const result = validateManifest(manifest);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result;
}

function osName(platform) {
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  if (platform === "linux") return "linux";
  return "unknown";
}

export function planManifest(manifest, { stateRoot = stateRootFromEnvironment(), platform = process.platform } = {}) {
  const validation = assertValid(manifest);
  const adapter = manifest.install.adapter;
  const currentOs = osName(platform);
  const compatible = manifest.compatibility.os.includes(currentOs);
  return {
    status: !compatible ? "incompatible" : AVAILABLE_ADAPTERS.has(adapter) ? "ready" : "adapter-unavailable",
    themeId: manifest.id,
    format: manifest.package.format,
    adapter,
    currentOs,
    compatible,
    managedStateRoot: stateRoot,
    requiresUserConfirmation: true,
    mutatesCodexBundle: false,
    warnings: validation.warnings,
  };
}

async function readJsonOrDefault(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

export async function stageManifest(manifest, { stateRoot = stateRootFromEnvironment(), now = () => new Date() } = {}) {
  const plan = planManifest(manifest, { stateRoot });
  if (plan.status !== "ready") throw new Error(`${plan.adapter} is not available in plugin v0.1.0`);

  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const revision = sha256(manifestText);
  const transactionId = randomUUID();
  const installedAt = now().toISOString();
  const themeRoot = path.join(stateRoot, "themes", manifest.id, revision);
  const manifestPath = path.join(themeRoot, "manifest.json");
  const payloadPath = path.join(themeRoot, "payload.txt");
  const statePath = path.join(stateRoot, "state.json");
  const transactionPath = path.join(stateRoot, "transactions", `${transactionId}.json`);

  const state = await readJsonOrDefault(statePath, {
    schemaVersion: "theme-hub-state/v1",
    active: null,
    installations: {},
  });
  const transaction = {
    schemaVersion: "theme-hub-transaction/v1",
    id: transactionId,
    status: "staged",
    themeId: manifest.id,
    revision,
    adapter: manifest.install.adapter,
    createdAt: installedAt,
    previousActive: state.active ?? null,
    manifestPath,
    payloadPath,
  };

  await mkdir(themeRoot, { recursive: true });
  await writeFile(manifestPath, manifestText, "utf8");
  await writeFile(payloadPath, `${manifest.package.inline}\n`, "utf8");
  await writeJsonAtomic(transactionPath, transaction);

  state.installations[manifest.id] ??= { revisions: {} };
  state.installations[manifest.id].revisions[revision] = {
    installedAt,
    manifestPath,
    payloadPath,
  };
  await writeJsonAtomic(statePath, state);

  return {
    status: "ready-for-confirmation",
    transactionId,
    themeId: manifest.id,
    revision,
    payloadPath,
    nextAction: "codex-native-import",
    instructions: [
      "Copy the prepared payload",
      "Open Codex Settings → Appearance → Import",
      "Paste and confirm the import",
      "Confirm the transaction only after the appearance changed",
    ],
  };
}

function assertTransactionId(transactionId) {
  if (!/^[0-9a-f-]{36}$/i.test(transactionId ?? "")) throw new Error("invalid transaction id");
}

async function loadTransaction(stateRoot, transactionId) {
  assertTransactionId(transactionId);
  const transactionPath = path.join(stateRoot, "transactions", `${transactionId}.json`);
  return {
    transactionPath,
    transaction: JSON.parse(await readFile(transactionPath, "utf8")),
  };
}

export async function confirmTransaction(transactionId, { stateRoot = stateRootFromEnvironment(), now = () => new Date() } = {}) {
  const { transactionPath, transaction } = await loadTransaction(stateRoot, transactionId);
  if (transaction.status !== "staged") throw new Error(`transaction is ${transaction.status}, not staged`);
  const statePath = path.join(stateRoot, "state.json");
  const state = await readJsonOrDefault(statePath, null);
  if (!state) throw new Error("managed state is missing");

  const confirmedAt = now().toISOString();
  state.active = {
    themeId: transaction.themeId,
    revision: transaction.revision,
    transactionId,
    confirmedAt,
  };
  transaction.status = "confirmed";
  transaction.confirmedAt = confirmedAt;
  await writeJsonAtomic(statePath, state);
  await writeJsonAtomic(transactionPath, transaction);
  return { status: "confirmed", active: state.active };
}

export async function restorePlan(transactionId, { stateRoot = stateRootFromEnvironment() } = {}) {
  const { transaction } = await loadTransaction(stateRoot, transactionId);
  if (!transaction.previousActive) {
    return {
      status: "ready-for-confirmation",
      nextAction: "select-codex-default",
      message: "No previous Theme Hub theme is recorded. Select the official default theme in Codex Appearance settings.",
    };
  }

  const state = await readJsonOrDefault(path.join(stateRoot, "state.json"), null);
  const previous = transaction.previousActive;
  const installation = state?.installations?.[previous.themeId]?.revisions?.[previous.revision];
  if (!installation?.payloadPath) throw new Error("previous theme payload is unavailable");
  await access(installation.payloadPath, fsConstants.R_OK);
  return {
    status: "ready-for-confirmation",
    nextAction: "codex-native-import",
    themeId: previous.themeId,
    payloadPath: installation.payloadPath,
    message: "Import this payload in Codex Appearance settings, then confirm the visual restore.",
  };
}

function copyToClipboard(text) {
  const candidates = process.platform === "darwin"
    ? [["pbcopy", []]]
    : process.platform === "win32"
      ? [["clip.exe", []]]
      : [["wl-copy", []], ["xclip", ["-selection", "clipboard"]]];

  for (const [command, args] of candidates) {
    const result = spawnSync(command, args, { input: text, encoding: "utf8" });
    if (!result.error && result.status === 0) return command;
  }
  throw new Error("no supported clipboard command is available");
}

export async function copyTransactionPayload(transactionId, { stateRoot = stateRootFromEnvironment() } = {}) {
  const { transaction } = await loadTransaction(stateRoot, transactionId);
  const payload = (await readFile(transaction.payloadPath, "utf8")).trimEnd();
  const provider = copyToClipboard(payload);
  return { status: "copied", transactionId, provider };
}

export async function readStatus({ stateRoot = stateRootFromEnvironment() } = {}) {
  return readJsonOrDefault(path.join(stateRoot, "state.json"), {
    schemaVersion: "theme-hub-state/v1",
    active: null,
    installations: {},
  });
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`invalid argument: ${key ?? ""}`);
    flags[key.slice(2)] = value;
  }
  return { command, flags };
}

async function main() {
  const { command, flags } = parseCli(process.argv.slice(2));
  const options = flags["state-root"] ? { stateRoot: path.resolve(flags["state-root"]) } : {};
  let result;

  if (command === "validate" || command === "plan" || command === "stage") {
    if (!flags.manifest) throw new Error("--manifest is required");
    const { manifest } = await loadManifest(flags.manifest);
    if (command === "validate") result = validateManifest(manifest);
    if (command === "plan") result = planManifest(manifest, options);
    if (command === "stage") result = await stageManifest(manifest, options);
  } else if (command === "copy") {
    if (!flags.transaction) throw new Error("--transaction is required");
    result = await copyTransactionPayload(flags.transaction, options);
  } else if (command === "confirm") {
    if (!flags.transaction) throw new Error("--transaction is required");
    result = await confirmTransaction(flags.transaction, options);
  } else if (command === "restore") {
    if (!flags.transaction) throw new Error("--transaction is required");
    result = await restorePlan(flags.transaction, options);
  } else if (command === "status") {
    result = await readStatus(options);
  } else {
    throw new Error("command must be validate, plan, stage, copy, confirm, restore, or status");
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (command === "validate" && !result.ok) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "error", error: error.message })}\n`);
    process.exitCode = 1;
  });
}
