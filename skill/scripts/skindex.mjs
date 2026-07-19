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
const DEFAULT_ENDPOINT = "https://codex-skindex.vercel.app";
const SKILL_VERSION = "0.5.2";
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

function requiredString(value, location, errors, { min = 1, max = 200 } = {}) {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) {
    errors.push(`${location} must be ${min}–${max} characters`);
    return false;
  }
  return true;
}

function validateColor(value, location, errors) {
  if (!/^#[0-9a-f]{6}$/i.test(value ?? "")) errors.push(`${location} must be a six-digit hex color`);
}

function parseNativePayload(payload, errors) {
  if (typeof payload !== "string" || !payload.startsWith("codex-theme-v1:")) {
    errors.push("package.inline must start with codex-theme-v1:");
    return null;
  }
  if (payload.length > 200_000) {
    errors.push("package.inline exceeds 200000 characters");
    return null;
  }
  try {
    return JSON.parse(payload.slice("codex-theme-v1:".length));
  } catch {
    errors.push("package.inline contains invalid codex-theme-v1 JSON");
    return null;
  }
}

function validateNativePayload(payload, errors) {
  const parsed = parseNativePayload(payload, errors);
  if (!parsed) return;

  if (!isObject(parsed) || !isObject(parsed.theme)) {
    errors.push("native payload must contain a theme object");
    return;
  }
  rejectUnknownKeys(parsed, new Set(["codeThemeId", "theme", "variant"]), "package.inline", errors);
  rejectUnknownKeys(parsed.theme, new Set(["accent", "contrast", "fonts", "ink", "opaqueWindows", "semanticColors", "surface"]), "package.inline.theme", errors);
  rejectUnknownKeys(parsed.theme.fonts, new Set(["code", "ui"]), "package.inline.theme.fonts", errors);
  rejectUnknownKeys(parsed.theme.semanticColors, new Set(["diffAdded", "diffRemoved", "skill"]), "package.inline.theme.semanticColors", errors);
  if (parsed.codeThemeId !== "codex") errors.push("native payload codeThemeId must be codex");
  if (!new Set(["dark", "light"]).has(parsed.variant)) {
    errors.push("native payload variant must be dark or light");
  }
  for (const color of ["surface", "ink", "accent"]) {
    validateColor(parsed.theme[color], `native payload theme.${color}`, errors);
  }
  if (!Number.isInteger(parsed.theme.contrast) || parsed.theme.contrast < 0 || parsed.theme.contrast > 100) {
    errors.push("native payload theme.contrast must be an integer from 0 to 100");
  }
  if (parsed.theme.opaqueWindows !== true && parsed.theme.opaqueWindows !== false) {
    errors.push("native payload theme.opaqueWindows must be boolean");
  }
  if (!isObject(parsed.theme.fonts)) errors.push("native payload theme.fonts must be an object");
  else {
    requiredString(parsed.theme.fonts.code, "native payload theme.fonts.code", errors, { max: 80 });
    requiredString(parsed.theme.fonts.ui, "native payload theme.fonts.ui", errors, { max: 80 });
  }
  if (!isObject(parsed.theme.semanticColors)) errors.push("native payload theme.semanticColors must be an object");
  else {
    for (const color of ["diffAdded", "diffRemoved", "skill"]) {
      validateColor(parsed.theme.semanticColors[color], `native payload theme.semanticColors.${color}`, errors);
    }
  }
}

function canonicalNativePayload(payload) {
  const parsed = parseNativePayload(payload, []);
  return `codex-theme-v1:${JSON.stringify({
    codeThemeId: parsed.codeThemeId,
    theme: {
      accent: parsed.theme.accent,
      contrast: parsed.theme.contrast,
      fonts: { code: parsed.theme.fonts.code, ui: parsed.theme.fonts.ui },
      ink: parsed.theme.ink,
      opaqueWindows: parsed.theme.opaqueWindows,
      semanticColors: {
        diffAdded: parsed.theme.semanticColors.diffAdded,
        diffRemoved: parsed.theme.semanticColors.diffRemoved,
        skill: parsed.theme.semanticColors.skill,
      },
      surface: parsed.theme.surface,
    },
    variant: parsed.variant,
  })}`;
}

export function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  if (!isObject(manifest)) return { ok: false, errors: ["manifest must be a JSON object"], warnings };
  if (JSON.stringify(manifest).length > 250_000) errors.push("manifest exceeds 250000 characters");

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
  rejectUnknownKeys(manifest.install, new Set(["adapter", "experience", "supportLevel", "requiresUserConfirmation", "rollback"]), "install", errors);

  if (manifest.schemaVersion !== "skindex/v1") errors.push("schemaVersion must be skindex/v1");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id ?? "") || String(manifest.id ?? "").length > 80) errors.push("id must be lowercase kebab-case and at most 80 characters");
  requiredString(manifest.name, "name", errors, { max: 120 });
  requiredString(manifest.summary, "summary", errors, { max: 280 });

  if (!isObject(manifest.author) || typeof manifest.author.name !== "string" || !isHttps(manifest.author.url)) {
    errors.push("author.name and an HTTPS author.url are required");
  } else {
    requiredString(manifest.author.name, "author.name", errors, { max: 100 });
    if (manifest.author.url.length > 2048) errors.push("author.url exceeds 2048 characters");
  }
  if (!isObject(manifest.source) || !isHttps(manifest.source.repository)) {
    errors.push("source.repository must be HTTPS");
  } else if (manifest.source.repository.length > 2048) {
    errors.push("source.repository exceeds 2048 characters");
  }
  if (isObject(manifest.source)) {
    requiredString(manifest.source.revision, "source.revision", errors, { max: 160 });
    requiredString(manifest.source.license, "source.license", errors, { max: 160 });
  }

  const surfaces = manifest.compatibility?.surfaces;
  const systems = manifest.compatibility?.os;
  if (!Array.isArray(surfaces) || !surfaces.includes("codex-desktop")) {
    errors.push("compatibility.surfaces must include codex-desktop");
  }
  if (!Array.isArray(systems) || !systems.length || systems.some((item) => !["macos", "windows", "linux"].includes(item))) {
    errors.push("compatibility.os must contain supported operating systems");
  }
  if (!isHttps(manifest.preview?.imageUrl) || manifest.preview.imageUrl.length > 2048) errors.push("preview.imageUrl must be HTTPS and at most 2048 characters");

  const format = manifest.package?.format;
  const expectedAdapter = FORMAT_ADAPTERS[format];
  if (!expectedAdapter) errors.push("package.format is not recognized");
  if (manifest.install?.adapter !== expectedAdapter) {
    errors.push(`install.adapter must be ${expectedAdapter ?? "a recognized adapter"} for ${format ?? "this format"}`);
  }
  if (manifest.install?.experience !== undefined && manifest.install.experience !== "guided-import") {
    errors.push("install.experience must be guided-import");
  }
  if (manifest.install?.supportLevel !== undefined && !["native", "partial", "adapter-pending"].includes(manifest.install.supportLevel)) {
    errors.push("install.supportLevel is not recognized");
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
    warnings.push(`${expectedAdapter} is recognized but unavailable in SkinDex Skill v${SKILL_VERSION}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function stateRootFromEnvironment({ platform = process.platform, env = process.env, home = homedir() } = {}) {
  if (env.SKINDEX_HOME) return path.resolve(env.SKINDEX_HOME);
  if (platform === "win32") {
    if (!env.LOCALAPPDATA) throw new Error("LOCALAPPDATA is required on Windows");
    return path.join(env.LOCALAPPDATA, "SkinDex");
  }
  return path.join(home, ".skindex");
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
  if (plan.status !== "ready") throw new Error(`${plan.adapter} is not available in SkinDex Skill v${SKILL_VERSION}`);

  const normalizedManifest = structuredClone(manifest);
  normalizedManifest.package.inline = canonicalNativePayload(manifest.package.inline);
  const manifestText = `${JSON.stringify(normalizedManifest, null, 2)}\n`;
  const revision = sha256(manifestText);
  const transactionId = randomUUID();
  const installedAt = now().toISOString();
  const themeRoot = path.join(stateRoot, "themes", manifest.id, revision);
  const manifestPath = path.join(themeRoot, "manifest.json");
  const payloadPath = path.join(themeRoot, "payload.txt");
  const statePath = path.join(stateRoot, "state.json");
  const transactionPath = path.join(stateRoot, "transactions", `${transactionId}.json`);

  const state = await readJsonOrDefault(statePath, {
    schemaVersion: "skindex-state/v1",
    active: null,
    installations: {},
  });
  const transaction = {
    schemaVersion: "skindex-transaction/v1",
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
  await writeFile(payloadPath, `${normalizedManifest.package.inline}\n`, "utf8");
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
      message: "No previous SkinDex theme is recorded. Select the official default theme in Codex Appearance settings.",
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

export async function copyTransactionPayload(transactionId, {
  stateRoot = stateRootFromEnvironment(),
  copyImpl = copyToClipboard,
} = {}) {
  const { transaction } = await loadTransaction(stateRoot, transactionId);
  const payload = (await readFile(transaction.payloadPath, "utf8")).trimEnd();
  try {
    const provider = copyImpl(payload);
    return {
      status: "copied",
      transactionId,
      provider,
      settingsUrl: "codex://settings",
      nextAction: "open-codex-settings",
    };
  } catch {
    return {
      status: "clipboard-permission-required",
      transactionId,
      payloadPath: transaction.payloadPath,
      settingsUrl: "codex://settings",
      nextAction: "request-clipboard-access",
      message: "Request narrow system clipboard access and copy the managed payload file. Do not show its contents unless the user declines or the retry fails.",
    };
  }
}

export async function readStatus({ stateRoot = stateRootFromEnvironment() } = {}) {
  const state = await readJsonOrDefault(path.join(stateRoot, "state.json"), {
    schemaVersion: "skindex-state/v1",
    active: null,
    installations: {},
  });
  return { ...state, skillVersion: SKILL_VERSION };
}

function endpointUrl(endpoint, pathname, search = {}) {
  const base = new URL(endpoint || DEFAULT_ENDPOINT);
  if (base.protocol !== "https:") throw new Error("SkinDex endpoint must use HTTPS");
  const url = new URL(pathname, base);
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }
  return url;
}

async function responseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `SkinDex request failed with ${response.status}`);
  return data;
}

export async function catalogThemes({ endpoint = DEFAULT_ENDPOINT, query = "", fetchImpl = fetch } = {}) {
  const requestedQuery = query.trim().slice(0, 80);
  const data = await responseJson(await fetchImpl(endpointUrl(endpoint, "/api/themes", { q: requestedQuery })));
  const normalized = requestedQuery.toLowerCase();
  const themes = Array.isArray(data.themes) ? data.themes : [];
  const matches = themes.filter((theme) => {
    if (!normalized) return true;
    const text = [theme.id, theme.name, theme.description, theme.mode, theme.platform, ...(theme.tags ?? [])].join(" ").toLowerCase();
    return text.includes(normalized);
  });
  return {
    endpoint,
    query: requestedQuery,
    total: Number(data.pagination?.total ?? matches.length),
    themes: matches.slice(0, 8).map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      platform: theme.platform,
      mode: theme.mode,
      nativeImport: String(theme.verifiedVersion ?? "").includes("codex-theme-v1"),
      install: theme.install ?? {
        supportLevel: String(theme.verifiedVersion ?? "").includes("codex-theme-v1") ? "native" : "adapter-pending",
        action: String(theme.verifiedVersion ?? "").includes("codex-theme-v1") ? "guided-import" : "view-source",
      },
      source: theme.sourceName,
    })),
  };
}

export async function fetchThemeManifest(themeId, outputPath, { endpoint = DEFAULT_ENDPOINT, fetchImpl = fetch } = {}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(themeId ?? "")) throw new Error("theme ID must be lowercase kebab-case");
  const url = endpointUrl(endpoint, "/api/themes", { format: "manifest", id: themeId });
  const manifest = await responseJson(await fetchImpl(url));
  assertValid(manifest);
  const resolved = path.resolve(outputPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { status: "fetched", themeId, manifestPath: resolved, manifestUrl: url.toString() };
}

function validHex(value) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "");
}

export function createLocalManifest({ id, name, author, surface, ink, accent, mode = "dark", now = () => new Date() }) {
  if (![surface, ink, accent].every(validHex)) throw new Error("surface, ink, and accent must be six-digit hex colors");
  if (!new Set(["light", "dark"]).has(mode)) throw new Error("mode must be light or dark");
  const manifest = {
    schemaVersion: "skindex/v1",
    id,
    name,
    summary: "Locally generated SkinDex color theme.",
    author: { name: author, url: DEFAULT_ENDPOINT },
    source: { repository: DEFAULT_ENDPOINT, revision: `local@${now().toISOString()}`, license: "NOASSERTION" },
    compatibility: { surfaces: ["codex-desktop"], os: ["macos", "windows", "linux"] },
    preview: { imageUrl: `${DEFAULT_ENDPOINT}/og.png` },
    package: {
      format: "codex-theme-v1",
      inline: `codex-theme-v1:${JSON.stringify({
        codeThemeId: "codex",
        theme: {
          accent,
          contrast: 72,
          fonts: { code: "Cascadia Mono", ui: "Noto Sans TC" },
          ink,
          opaqueWindows: true,
          semanticColors: { diffAdded: "#397253", diffRemoved: "#A34C4C", skill: "#76558E" },
          surface,
        },
        variant: mode,
      })}`,
    },
    install: {
      adapter: "codex-native-v1",
      experience: "guided-import",
      supportLevel: "native",
      requiresUserConfirmation: true,
      rollback: "restore-point",
    },
    updatedAt: now().toISOString(),
  };
  assertValid(manifest);
  return manifest;
}

function previewMime(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".png") return "image/png";
  throw new Error("preview must be PNG, JPEG, or WebP");
}

export async function submitThemeProposal({
  name,
  author,
  platform,
  palette,
  previewPath,
  notes = "",
  consent,
  endpoint = DEFAULT_ENDPOINT,
  fetchImpl = fetch,
}) {
  if (consent !== "yes") throw new Error("explicit --consent yes is required before uploading a proposal");
  const colors = String(palette ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (colors.length < 3 || colors.length > 6 || colors.some((color) => !validHex(color))) {
    throw new Error("palette must contain 3–6 comma-separated hex colors");
  }
  const bytes = await readFile(path.resolve(previewPath));
  if (!bytes.length || bytes.length > 700 * 1024) throw new Error("review thumbnail must be between 1 byte and 700 KB");
  const mime = previewMime(previewPath);
  const form = new FormData();
  form.set("metadata", JSON.stringify({
    themeName: name,
    authorName: author,
    platform,
    notes,
    palette: colors,
    sourceType: "reference-image",
    consent: true,
  }));
  form.set("preview", new Blob([bytes], { type: mime }), path.basename(previewPath));
  const data = await responseJson(await fetchImpl(endpointUrl(endpoint, "/api/theme-proposals"), {
    method: "POST",
    headers: { "X-SkinDex-Client": "skindex-skill-v1" },
    body: form,
  }));
  return {
    ...data.proposal,
    public: false,
    publication: "review-required",
  };
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
  } else if (command === "catalog") {
    result = await catalogThemes({ endpoint: flags.endpoint, query: flags.query ?? "" });
  } else if (command === "fetch") {
    if (!flags.theme || !flags.output) throw new Error("--theme and --output are required");
    result = await fetchThemeManifest(flags.theme, flags.output, { endpoint: flags.endpoint });
  } else if (command === "create") {
    for (const required of ["id", "name", "author", "surface", "ink", "accent", "output"]) {
      if (!flags[required]) throw new Error(`--${required} is required`);
    }
    const manifest = createLocalManifest({
      id: flags.id,
      name: flags.name,
      author: flags.author,
      surface: flags.surface,
      ink: flags.ink,
      accent: flags.accent,
      mode: flags.mode ?? "dark",
    });
    const outputPath = path.resolve(flags.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    result = { status: "created", themeId: manifest.id, manifestPath: outputPath };
  } else if (command === "submit") {
    for (const required of ["name", "author", "platform", "palette", "preview", "consent"]) {
      if (!flags[required]) throw new Error(`--${required} is required`);
    }
    result = await submitThemeProposal({
      name: flags.name,
      author: flags.author,
      platform: flags.platform,
      palette: flags.palette,
      previewPath: flags.preview,
      notes: flags.notes ?? "",
      consent: flags.consent,
      endpoint: flags.endpoint,
    });
  } else {
    throw new Error("command must be catalog, fetch, create, validate, plan, stage, copy, confirm, restore, status, or submit");
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
