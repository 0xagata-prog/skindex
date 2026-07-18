"use client";

/* eslint-disable @next/next/no-img-element -- previews are intentionally served by their source repositories */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { buildNativeThemePayload } from "../lib/theme-manifest";

type Theme = {
  id: string;
  name: string;
  author: string;
  authorUrl: string;
  platform: "桌面端" | "CLI" | "全平台";
  mode: "深色" | "浅色" | "双模式";
  description: string;
  tags: string[];
  palette: string[];
  previewUrl: string;
  sourceUrl: string;
  downloadUrl: string;
  sourceName: string;
  sourceRepo: string;
  stars: number;
  license: string;
  verifiedVersion: string;
  featured: boolean;
  updatedAt: string;
};

type CatalogResponse = {
  themes: Theme[];
  stats: { themes: number; sources: number; creators: number };
  syncedAt: string;
};

type InstallGuide = {
  kind: "copy" | "skin" | "styler";
  buttonLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  steps: string[];
  copyValue?: string;
  primaryUrl?: string;
  primaryLabel?: string;
  secondaryUrl?: string;
  secondaryLabel?: string;
};

const filters = ["全部", "桌面端", "CLI", "深色", "浅色", "双模式"] as const;

const pluginBundleUrl = "/downloads/codex-theme-hub-plugin.zip";
const pluginInstallCommand = "codex plugin marketplace add .";

function skillChatUrl(prompt: string) {
  return `codex://new?prompt=${encodeURIComponent(`$theme-hub ${prompt}`)}`;
}

const skinDownloads: Record<string, string> = {
  "fortune-pavilion": "caishen-jubao-1.0.1.codexskin",
  "celestial-court": "celestial-court-1.0.1.codexskin",
  "ming-imperial": "ming-imperial-1.0.1.codexskin",
  "underworld-tribunal": "underworld-yama-1.0.1.codexskin",
};

function getInstallGuide(theme: Theme): InstallGuide {
  if (theme.verifiedVersion.includes("codex-theme-v1")) {
    const isLabConcept = theme.sourceRepo === "theme-hub/lab";
    const copyValue = buildNativeThemePayload(theme);
    return {
      kind: "copy",
      buttonLabel: isLabConcept ? "导入概念配色" : "复制并导入",
      eyebrow: isLabConcept ? "REFERENCE-TO-THEME LAB" : "CODEX NATIVE THEME",
      title: `导入 ${theme.name}`,
      description: isLabConcept
        ? "这是从用户参考图提炼的原创概念主题。当前导入会应用冰蓝配色；复古三栏布局和机器人伙伴属于后续皮肤运行时，不会随原生配色一起安装。"
        : "这是 Codex 原生主题配置。网站可以帮你复制完整设置，但浏览器不能越过系统安全限制直接修改 Codex。",
      steps: ["点击下方按钮复制完整主题设置", "打开 Codex → 设置 → 外观 → 导入", "粘贴设置并选择“导入主题”"],
      copyValue,
    };
  }

  if (theme.sourceRepo === "Wangnov/awesome-codex-skins") {
    const filename = skinDownloads[theme.id];
    return {
      kind: "skin",
      buttonLabel: "下载皮肤",
      eyebrow: ".CODEXSKIN PACKAGE",
      title: `安装 ${theme.name}`,
      description: "这是经过仓库质量门验证的 .codexskin 包。下载后由 Codex App Manager 完成试穿、应用和还原。",
      steps: ["下载下方 .codexskin 文件", "打开 Codex App Manager 的主题页面", "把文件拖入页面，选择“试穿”或“应用”"],
      primaryUrl: `https://github.com/Wangnov/awesome-codex-skins/releases/download/skins-v1.1.0/${filename}`,
      primaryLabel: "下载 .codexskin ↓",
      secondaryUrl: "https://github.com/Wangnov/Codex-App-Manager",
      secondaryLabel: "获取 Codex App Manager ↗",
    };
  }

  return {
    kind: "styler",
    buttonLabel: "安装后使用",
    eyebrow: "CODEX STYLER BETA",
    title: `使用 ${theme.name}`,
    description: "这类场景主题由 Codex Styler 管理。选择系统安装包，安装后即可在 Styler 中切换主题并随时还原。",
    steps: ["下载与你电脑匹配的安装包", "安装并首次打开 Codex Styler", "在主题场景中选择并应用此主题"],
    primaryUrl: "https://github.com/xuhuanstudio/codex-styler/releases/download/v0.2.0-beta.2/Codex-Styler_0.2.0-beta.2_aarch64-unsigned.dmg",
    primaryLabel: "下载 macOS Apple 芯片版 ↓",
    secondaryUrl: "https://github.com/xuhuanstudio/codex-styler/releases/download/v0.2.0-beta.2/Codex-Styler_0.2.0-beta.2_x64-unsigned-setup.exe",
    secondaryLabel: "下载 Windows x64 版 ↓",
  };
}

function ThemePreview({ theme, large = false }: { theme: Theme; large?: boolean }) {
  return (
    <div className={`real-theme-preview ${large ? "is-large" : ""}`}>
      <img src={theme.previewUrl} alt={`${theme.name} 的真实界面预览`} loading={large ? "eager" : "lazy"} />
      <span>{theme.sourceName}</span>
    </div>
  );
}

function ThemeCard({
  theme,
  saved,
  onSave,
  onOpen,
  onUse,
}: {
  theme: Theme;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  onUse: () => void;
}) {
  const installGuide = getInstallGuide(theme);
  return (
    <article className="theme-card real-card">
      <button className="preview-button" onClick={onOpen} aria-label={`查看 ${theme.name} 详情`}>
        <ThemePreview theme={theme} />
        <span className="preview-action">查看详情 <b>↗</b></span>
      </button>
      <div className="card-body">
        <div className="card-heading">
          <div>
            <div className="eyebrow-row">
              <span>{theme.platform}</span>
              <span>{theme.mode}</span>
              {theme.featured && <b className="trend-label">精选</b>}
            </div>
            <button className="title-button" onClick={onOpen}>{theme.name}</button>
          </div>
          <button
            className={`save-button ${saved ? "is-saved" : ""}`}
            onClick={onSave}
            aria-label={saved ? `取消收藏 ${theme.name}` : `收藏 ${theme.name}`}
            aria-pressed={saved}
          >
            {saved ? "♥" : "♡"}
          </button>
        </div>
        <p className="card-description">{theme.description}</p>
        <div className="author-line">
          <span className="avatar">{theme.author.slice(0, 1)}</span>
          <a href={theme.authorUrl} target="_blank" rel="noreferrer">{theme.author}</a>
          <small>{theme.sourceRepo}</small>
        </div>
        <div className="tag-row">
          {theme.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <button className="use-now-button" onClick={onUse}>{installGuide.buttonLabel}<span>→</span></button>
        <div className="card-footer">
          <span>★ {theme.stars}</span>
          <span className="source-label">{theme.sourceName}</span>
          <span className="compatibility">✓ {theme.verifiedVersion}</span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [stats, setStats] = useState({ themes: 0, sources: 0, creators: 0 });
  const [syncedAt, setSyncedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("全部");
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<Theme | null>(null);
  const [installTheme, setInstallTheme] = useState<Theme | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [pluginOpen, setPluginOpen] = useState(false);
  const [pluginCopyState, setPluginCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const task = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("codex-theme-hub-saved");
        const parsed = stored ? JSON.parse(stored) : [];
        setSaved(Array.isArray(parsed) ? parsed.map(String) : []);
      } catch {
        window.localStorage.removeItem("codex-theme-hub-saved");
      }
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/themes")
      .then(async (response) => {
        if (!response.ok) throw new Error("主题目录暂时无法读取");
        return response.json() as Promise<CatalogResponse>;
      })
      .then((data) => {
        if (!active) return;
        setThemes(data.themes);
        setStats(data.stats);
        setSyncedAt(data.syncedAt);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : "主题目录暂时无法读取");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visibleThemes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return themes.filter((theme) => {
      const matchesFilter =
        filter === "全部" ||
        theme.platform === filter ||
        theme.platform === "全平台" && (filter === "桌面端" || filter === "CLI") ||
        theme.mode === filter ||
        theme.mode === "双模式" && (filter === "深色" || filter === "浅色");
      const haystack = `${theme.name} ${theme.author} ${theme.sourceName} ${theme.sourceRepo} ${theme.tags.join(" ")}`.toLowerCase();
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [filter, query, themes]);

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem("codex-theme-hub-saved", JSON.stringify(next));
      return next;
    });
  };

  const openInstall = (theme: Theme) => {
    setSelected(null);
    setInstallTheme(theme);
    setCopyState("idle");
  };

  const copyThemeSetting = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const copyPluginCommand = async () => {
    try {
      await navigator.clipboard.writeText(pluginInstallCommand);
      setPluginCopyState("copied");
    } catch {
      setPluginCopyState("error");
    }
  };

  const submitTheme = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitState("sending");
    setSubmitMessage("");
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeName: data.get("themeName"),
          authorName: data.get("authorName"),
          repoUrl: data.get("repoUrl"),
          platform: data.get("platform"),
          notes: data.get("notes"),
          website: data.get("website"),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "投稿保存失败");
      form.reset();
      setSubmitState("success");
      setSubmitMessage("投稿已进入审核队列。我们只保存仓库信息，不复制你的素材。 ");
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "投稿保存失败");
    }
  };

  const featured = themes.find((theme) => theme.featured) ?? themes[0];

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Codex Theme Hub 首页"><span>C</span><strong>Codex Theme Hub</strong></a>
        <nav aria-label="主导航"><a href="#skill">主题 Skill</a><a href="#themes">真实主题</a><a href="#sources">数据来源</a><button onClick={() => setSubmitOpen(true)}>投稿</button></nav>
        <button className="submit-nav" onClick={() => { setPluginOpen(true); setPluginCopyState("idle"); }}>安装 Skill <span>↗</span></button>
      </header>

      <section className="hero real-hero" id="top">
        <div className="hero-copy">
          <div className="hero-label"><span>LIVE CATALOG</span><i>●</i> 公开来源 · 持久数据</div>
          <h1>真实主题，<br /><em>真实来源。</em></h1>
          <p>官网负责发现和创作，Theme Hub Skill 负责在 Codex 里对话切换。你也可以发一张图片，让它生成主题并在确认后提交回官网审核。</p>
          <div className="hero-actions">
            <button onClick={() => { setPluginOpen(true); setPluginCopyState("idle"); }}>安装 Theme Hub Skill <span>→</span></button>
            <a href={skillChatUrl("帮我从官网挑一个适合长时间编码的主题。")}>打开 Codex 对话 ↗</a>
          </div>
          <form className="hero-search" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="theme-search" className="sr-only">搜索主题、作者或仓库</label>
            <span aria-hidden="true">⌕</span>
            <input id="theme-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索主题、作者或 GitHub 仓库…" />
            <kbd>LIVE</kbd>
          </form>
          <div className="hero-stats" aria-label="目录数据">
            <span><strong>{loading ? "—" : stats.themes}</strong> 个真实主题</span>
            <span><strong>{loading ? "—" : stats.sources}</strong> 个公开来源</span>
            <span><strong>{loading ? "—" : stats.creators}</strong> 位创作者</span>
          </div>
        </div>
        <div className="hero-showcase real-showcase">
          <div className="showcase-note">VERIFIED SOURCE <span>{featured ? "01" : "—"}</span></div>
          <div className="showcase-card">
            {featured ? <ThemePreview theme={featured} large /> : <div className="preview-skeleton" />}
            <div className="showcase-meta">
              <span>{featured?.sourceName ?? "正在读取目录"}</span>
              <strong>{featured?.name ?? "Loading themes…"}</strong>
              <small>{featured ? `by ${featured.author}` : ""}</small>
            </div>
          </div>
          <div className="floating-chip chip-one"><b>GitHub</b> 来源可追溯</div>
          <div className="floating-chip chip-two"><span>●</span> {featured?.sourceName === "Theme Hub Lab" ? "参考图同人创作" : "预览来自原仓库"}</div>
        </div>
      </section>

      <section className="skill-section" id="skill">
        <div className="skill-intro">
          <span className="section-index">01 / CODEX PLUGIN</span>
          <h2>装一次，之后直接和主题助手说话。</h2>
          <p>用户安装的是 Codex Theme Hub 插件，插件里包含 <b>$theme-hub</b> Skill。官网是实时数据源，Skill 是执行层。</p>
          <div className="skill-actions">
            <button onClick={() => { setPluginOpen(true); setPluginCopyState("idle"); }}>下载开发预览包 ↓</button>
            <span>公开插件目录审核前 · 不需要连接 GPT API</span>
          </div>
        </div>
        <div className="conversation-grid" aria-label="Theme Hub Skill 可以完成的对话">
          <a href={skillChatUrl("把官网的蓝色信使 2007 配色应用到 Codex，并先创建恢复点。")}>
            <span>01 / SWITCH</span><strong>“换成官网这个皮肤”</strong><p>读取官网 Manifest、检查兼容性、应用主题并保留恢复点。</p><b>开始对话 ↗</b>
          </a>
          <a href={skillChatUrl("我会发一张参考图片，请帮我生成一个原创 Codex 主题和预览。")}>
            <span>02 / CREATE</span><strong>“参考这张图做一个”</strong><p>分析视觉语言、生成原创预览、提取配色并先保存在本地。</p><b>开始对话 ↗</b>
          </a>
          <a href={skillChatUrl("把刚生成的主题提交到 Theme Hub；上传前先告诉我会公开哪些内容并等待确认。")}>
            <span>03 / SUBMIT</span><strong>“愿意提交到官网吗？”</strong><p>只有明确同意后才上传图片和主题信息，先进入审核，不会直接公开。</p><b>开始对话 ↗</b>
          </a>
        </div>
      </section>

      <section className="market" id="themes">
        <div className="market-heading">
          <div><span className="section-index">02 / REAL THEMES</span><h2>主题目录</h2></div>
          <p>不使用虚构下载量或作者数据。GitHub 星标、许可和验证版本均显示真实来源信息。</p>
        </div>
        <div className="filter-row">
          <div className="filter-tabs" aria-label="主题筛选">
            {filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>)}
          </div>
          <span>{loading ? "正在读取…" : `${visibleThemes.length} 个结果`}</span>
        </div>

        {loading ? (
          <div className="catalog-loading" aria-live="polite">正在从主题数据库读取真实目录…</div>
        ) : loadError ? (
          <div className="empty-state"><span>!</span><h3>目录暂时不可用</h3><p>{loadError}</p><button onClick={() => window.location.reload()}>重新加载</button></div>
        ) : visibleThemes.length > 0 ? (
          <div className="theme-grid">
            {visibleThemes.map((theme) => <ThemeCard key={theme.id} theme={theme} saved={saved.includes(theme.id)} onSave={() => toggleSaved(theme.id)} onOpen={() => setSelected(theme)} onUse={() => openInstall(theme)} />)}
          </div>
        ) : (
          <div className="empty-state"><span>⌕</span><h3>没有找到对应主题</h3><p>换个关键词，或清除当前筛选条件。</p><button onClick={() => { setQuery(""); setFilter("全部"); }}>查看全部主题</button></div>
        )}
      </section>

      <section className="sources-section" id="sources">
        <div className="market-heading">
          <div><span className="section-index">03 / SOURCES</span><h2>主题来源</h2></div>
          <p>公开项目保留原仓库链接；参考图生成主题由 Theme Hub Lab 提炼原创预览与可导入配色。</p>
        </div>
        <div className="source-grid">
          <a href="https://github.com/robinli/codex-material-themes" target="_blank" rel="noreferrer"><span>01</span><h3>Codex Material Themes</h3><p>12 款可通过 codex-theme-v1 导入的材质配色主题。</p><b>打开 GitHub ↗</b></a>
          <a href="https://github.com/xuhuanstudio/codex-styler" target="_blank" rel="noreferrer"><span>02</span><h3>Codex Styler</h3><p>开源主题编辑器、场景皮肤与互动伙伴系统。</p><b>打开 GitHub ↗</b></a>
          <a href="https://github.com/Wangnov/awesome-codex-skins" target="_blank" rel="noreferrer"><span>03</span><h3>Awesome Codex Skins</h3><p>.codexskin 标准、认证注册表和真实应用截图。</p><b>打开 GitHub ↗</b></a>
          <a href="#themes"><span>04</span><h3>Theme Hub Lab</h3><p>把用户参考图转化为原创主题概念、预览和可导入配色。</p><b>查看实验主题 ↑</b></a>
        </div>
        {syncedAt && <p className="sync-note">数据库响应时间：{new Date(syncedAt).toLocaleString("zh-CN")} · 元数据更新以源仓库为准</p>}
      </section>

      <section className="creator-banner" id="creators">
        <div className="creator-dots" aria-hidden="true"><span>G</span><span>H</span><span>✓</span></div>
        <div><span className="section-index">04 / SUBMIT</span><h2>让你的主题进入目录。</h2><p>可以提交 GitHub 仓库，也可以在 Codex 里通过 Skill 提交生成主题。两种方式都先进入审核，审核通过前不会公开。</p></div>
        <button onClick={() => setSubmitOpen(true)}>提交主题仓库 <span>↗</span></button>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span>C</span><strong>Codex Theme Hub</strong></a>
        <p>公开浏览 · 来源可追溯 · 不强绑 ChatGPT 登录</p>
        <div><a href="#skill">安装 Skill</a><a href="#sources">数据来源</a><a href="#creators">提交主题</a><a href="#top">回到顶部 ↑</a></div>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <section className="detail-modal real-detail" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="关闭详情">×</button>
            <ThemePreview theme={selected} large />
            <div className="detail-content">
              <div className="eyebrow-row"><span>{selected.platform}</span><span>{selected.mode}</span><b>{selected.sourceName}</b></div>
              <h2 id="detail-title">{selected.name}</h2>
              <p>{selected.description}</p>
              <div className="palette-row" aria-label="主题色板">{selected.palette.map((color) => <span key={color} style={{ background: color }}><small>{color}</small></span>)}</div>
              <div className="detail-facts">
                <span><b>{selected.sourceRepo}</b> 来源仓库</span>
                <span><b>★ {selected.stars}</b> GitHub 星标</span>
                <span><b>{selected.license}</b> 许可</span>
                <span><b>{selected.verifiedVersion}</b> 验证信息</span>
              </div>
              <div className="detail-actions">
                <button className="primary-action" onClick={() => openInstall(selected)}>立即使用 →</button>
                <a className="detail-link-button" href={selected.sourceUrl} target="_blank" rel="noreferrer">查看源仓库 ↗</a>
              </div>
            </div>
          </section>
        </div>
      )}

      {installTheme && (() => {
        const guide = getInstallGuide(installTheme);
        return (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setInstallTheme(null)}>
            <section className="install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onMouseDown={(event) => event.stopPropagation()}>
              <button className="modal-close" onClick={() => setInstallTheme(null)} aria-label="关闭安装说明">×</button>
              <span className="section-index">{guide.eyebrow}</span>
              <h2 id="install-title">{guide.title}</h2>
              <p>{guide.description}</p>
              <a className="skill-use-link" href={skillChatUrl(`使用官网主题 ${installTheme.name}（ID: ${installTheme.id}）。请从 Theme Hub 官方目录读取数据、检查兼容性并先创建恢复点。`)}>
                在 Codex 中让 $theme-hub 完成 →
              </a>
              <ol className="install-steps">
                {guide.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><p>{step}</p></li>)}
              </ol>
              {guide.kind === "copy" && guide.copyValue ? (
                <>
                  <textarea className="theme-code" readOnly value={guide.copyValue} aria-label="完整主题设置" />
                  <button className="install-primary" onClick={() => copyThemeSetting(guide.copyValue!)}>
                    {copyState === "copied" ? "已复制，去 Codex 导入 ✓" : "复制完整主题设置"}
                  </button>
                  {copyState === "error" && <p className="install-error">浏览器未允许复制，请手动选择上方完整设置。</p>}
                </>
              ) : (
                <div className="install-links">
                  <a className="install-primary" href={guide.primaryUrl} target="_blank" rel="noreferrer">{guide.primaryLabel}</a>
                  <a className="install-secondary" href={guide.secondaryUrl} target="_blank" rel="noreferrer">{guide.secondaryLabel}</a>
                </div>
              )}
              <p className="install-source">{guide.kind === "copy" ? "Skill 流程和手动导入都需要你在 Codex 内确认；网站不会静默修改外观。" : "文件和安装器均直接来自原作者 GitHub Release，本站不重新打包。"}</p>
            </section>
          </div>
        );
      })()}

      {pluginOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPluginOpen(false)}>
          <section className="plugin-modal" role="dialog" aria-modal="true" aria-labelledby="plugin-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setPluginOpen(false)} aria-label="关闭插件安装说明">×</button>
            <span className="section-index">CODEX THEME HUB PLUGIN · PREVIEW</span>
            <h2 id="plugin-title">安装插件，获得 $theme-hub Skill</h2>
            <p>这是公开目录审核前的开发预览包。解压后把该目录加入 Codex Marketplace，再从 <b>/plugins</b> 安装 Codex Theme Hub。</p>
            <ol className="install-steps plugin-steps">
              <li><span>01</span><p>下载并解压插件包</p></li>
              <li><span>02</span><p>在解压目录运行下方命令</p></li>
              <li><span>03</span><p>重启 Codex，在 /plugins 中安装</p></li>
            </ol>
            <div className="plugin-command"><code>{pluginInstallCommand}</code><button onClick={copyPluginCommand}>{pluginCopyState === "copied" ? "已复制 ✓" : "复制命令"}</button></div>
            {pluginCopyState === "error" && <p className="install-error">浏览器未允许复制，请手动复制上方命令。</p>}
            <div className="plugin-downloads">
              <a className="install-primary" href={pluginBundleUrl} download>下载插件预览包 ↓</a>
              <a className="install-secondary" href={skillChatUrl("介绍 Theme Hub Skill 能做什么，并告诉我如何开始。")}>安装后开始对话 ↗</a>
            </div>
            <p className="install-source">公开插件目录的一键安装需要通过 OpenAI 插件审核；当前包适合测试产品流程。</p>
          </section>
        </div>
      )}

      {submitOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => { setSubmitOpen(false); setSubmitState("idle"); }}>
          <section className="submit-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => { setSubmitOpen(false); setSubmitState("idle"); }} aria-label="关闭投稿窗口">×</button>
            <span className="section-index">GITHUB SUBMISSION</span>
            <h2 id="submit-title">提交真实主题仓库</h2>
            <p>首版不要求账号登录。我们会核验仓库归属、许可、主题文件和真实预览，再决定是否公开收录。</p>
            {submitState === "success" ? (
              <div className="success-state"><span>✓</span><h3>已保存到审核队列</h3><p>{submitMessage}</p><button onClick={() => { setSubmitOpen(false); setSubmitState("idle"); }}>完成</button></div>
            ) : (
              <form onSubmit={submitTheme}>
                <label>主题名称<input name="themeName" required minLength={2} maxLength={80} placeholder="例如：Shanghai After Dark" /></label>
                <label>作者名称<input name="authorName" required minLength={2} maxLength={60} placeholder="你的 GitHub 名称" /></label>
                <label>GitHub 仓库<input name="repoUrl" type="url" required pattern="https://github\.com/.+/.+" placeholder="https://github.com/owner/repo" /></label>
                <label>支持平台<select name="platform" defaultValue="桌面端"><option>桌面端</option><option>CLI</option><option>全平台</option></select></label>
                <label className="notes-field">补充说明<textarea name="notes" maxLength={500} placeholder="主题格式、验证版本或安装方式（可选）" /></label>
                <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                {submitState === "error" && <p className="form-error" role="alert">{submitMessage}</p>}
                <button className="primary-action" type="submit" disabled={submitState === "sending"}>{submitState === "sending" ? "正在保存…" : "提交审核 →"}</button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
