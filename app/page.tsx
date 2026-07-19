"use client";

/* eslint-disable @next/next/no-img-element -- previews are intentionally served by their source repositories */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getThemeInstallability, type ThemeSupportLevel } from "../lib/theme-capability";
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
  install?: {
    supportLevel: ThemeSupportLevel;
    adapter: "codex-native-v1" | "codexskin-runtime-v1" | "codex-styler-v1";
    action: "guided-import" | "view-source";
    requiresUserConfirmation: true;
    rollback: "restore-point" | "unavailable";
  };
};

type CatalogResponse = {
  themes: Theme[];
  featuredTheme: Theme | null;
  stats: { themes: number; sources: number; creators: number };
  pagination: CatalogPagination;
  syncedAt: string;
};

type CatalogPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
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
  canUseInCodex: boolean;
  statusLabel: string;
  supportLevel: ThemeSupportLevel;
};

const filters = ["全部", "桌面端", "CLI", "深色", "浅色", "双模式"] as const;

const githubRepoUrl = "https://github.com/0xagata-prog/skindex";
const skillSourceUrl = `${githubRepoUrl}/tree/v0.5.2/skill`;
const skindexOrigin = "https://codex-skindex.vercel.app";
const SKINDEX_SKILL_READY_KEY = "skindex-skill-ready-v3";
const SKINDEX_SAVED_KEY = "skindex-saved-v1";
const emptyPagination: CatalogPagination = { page: 1, pageSize: 24, total: 0, totalPages: 0, hasPrevious: false, hasNext: false };

function pageItems(page: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const visible = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...visible].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  return pages.flatMap<(number | string)>((item, index) => {
    const previous = pages[index - 1];
    return previous && item - previous > 1 ? [`gap-${previous}-${item}`, item] : [item];
  });
}

function codexPromptUrl(prompt: string) {
  return `codex://new?prompt=${encodeURIComponent(prompt)}`;
}

function skindexChatUrl(request: string) {
  return codexPromptUrl(`$skindex\n${request}`);
}

function skillInstallerChatUrl() {
  return codexPromptUrl(`$skill-installer
安装官方 SkinDex Skill：${skillSourceUrl}
安装名：skindex`);
}

function themeUseChatUrl(theme: Theme, clipboardPrepared: boolean) {
  const request = JSON.stringify({
    version: "1",
    action: "install",
    themeId: theme.id,
    manifestUrl: `${skindexOrigin}/api/themes?format=manifest&id=${encodeURIComponent(theme.id)}`,
    themeRevision: theme.updatedAt,
    clipboardPrepared,
  });
  return codexPromptUrl(`$skindex
安装官网主题“${theme.name}”。
skindex_request=${request}`);
}

function getInstallGuide(theme: Theme): InstallGuide {
  const install = theme.install ?? getThemeInstallability(theme);
  if (install.action === "guided-import") {
    const isLabConcept = install.supportLevel === "partial";
    const copyValue = buildNativeThemePayload(theme);
    return {
      kind: "copy",
      buttonLabel: "用 SkinDex 快捷导入",
      eyebrow: isLabConcept ? "可导入配色 · 需确认" : "快捷导入 · 需确认",
      title: `安全应用 ${theme.name}`,
      description: isLabConcept
        ? "这是从用户参考图提炼的原创概念主题。当前导入会应用冰蓝配色；复古三栏布局和机器人伙伴属于后续皮肤运行时，不会随原生配色一起安装。"
        : "这是 Codex 原生主题配置。SkinDex 会验证主题、创建恢复点、复制设置并打开 Codex；你只需在外观中完成一次确认。",
      steps: ["打开 SkinDex 主题任务", "自动校验、复制并打开设置", "在 Codex 外观中粘贴并确认"],
      copyValue,
      canUseInCodex: true,
      statusLabel: isLabConcept ? "可导入配色 · 需确认" : "快捷导入 · 需确认",
      supportLevel: install.supportLevel,
    };
  }

  if (theme.sourceRepo === "Wangnov/awesome-codex-skins") {
    return {
      kind: "skin",
      buttonLabel: "查看主题详情",
      eyebrow: "第三方主题来源",
      title: `${theme.name} 暂未开放一键导入`,
      description: "SkinDex 已识别这个 .codexskin 来源，但当前 Skill 还没有经过验证、可回滚的运行时适配器，因此不会替你执行第三方安装器或修改 Codex。",
      steps: ["先查看原仓库的格式与许可说明", "等待 SkinDex 发布可信适配器", "适配器可用前继续保留当前 Codex 主题"],
      primaryUrl: theme.sourceUrl,
      primaryLabel: "查看格式仓库 ↗",
      secondaryUrl: theme.downloadUrl,
      secondaryLabel: "查看原始 Release ↗",
      canUseInCodex: false,
      statusLabel: "暂不支持导入",
      supportLevel: "adapter-pending",
    };
  }

  return {
    kind: "styler",
    buttonLabel: "查看主题详情",
    eyebrow: "第三方主题来源",
    title: `${theme.name} 暂未开放一键导入`,
    description: "这类场景主题依赖第三方 Codex Styler。当前 SkinDex Skill 只展示可追溯来源，不直接分发或执行未签名安装器。",
    steps: ["先查看原项目的能力、许可和风险说明", "等待 SkinDex 发布可信适配器", "适配器可用前不要把“查看来源”当作一键安装"],
    primaryUrl: theme.sourceUrl,
    primaryLabel: "查看源仓库 ↗",
    secondaryUrl: theme.downloadUrl,
    secondaryLabel: "查看原始 Release ↗",
    canUseInCodex: false,
    statusLabel: "暂不支持导入",
    supportLevel: "adapter-pending",
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
}: {
  theme: Theme;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const installGuide = getInstallGuide(theme);
  return (
    <article className="theme-card real-card">
      <button className="preview-button" onClick={onOpen} aria-label={`查看 ${theme.name} 详情`}>
        <ThemePreview theme={theme} />
        <span className={`theme-status-pill is-${installGuide.supportLevel}`}>{installGuide.statusLabel}</span>
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
        <button className="use-now-button" onClick={onOpen}>打开主题<span>→</span></button>
        <div className="card-footer">
          <span>★ {theme.stars}</span>
          <span className="source-label">{theme.sourceName}</span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [featuredTheme, setFeaturedTheme] = useState<Theme | null>(null);
  const [stats, setStats] = useState({ themes: 0, sources: 0, creators: 0 });
  const [pagination, setPagination] = useState<CatalogPagination>(emptyPagination);
  const [syncedAt, setSyncedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("全部");
  const [page, setPage] = useState(1);
  const [catalogReady, setCatalogReady] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<Theme | null>(null);
  const [installTheme, setInstallTheme] = useState<Theme | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [skillReady, setSkillReady] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
  const [skillInstallOpen, setSkillInstallOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const task = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(SKINDEX_SAVED_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        setSaved(Array.isArray(parsed) ? parsed.map(String) : []);
        setSkillReady(window.localStorage.getItem(SKINDEX_SKILL_READY_KEY) === "confirmed");
      } catch {
        window.localStorage.removeItem(SKINDEX_SAVED_KEY);
      }
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const initialQuery = params.get("q")?.trim().slice(0, 80) ?? "";
      const initialFilter = params.get("filter");
      const initialPage = Number.parseInt(params.get("page") ?? "1", 10);
      setQuery(initialQuery);
      setDebouncedQuery(initialQuery);
      if (initialFilter && filters.includes(initialFilter as (typeof filters)[number])) {
        setFilter(initialFilter as (typeof filters)[number]);
      }
      setPage(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
      setCatalogReady(true);
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    if (!catalogReady || query === debouncedQuery) return;
    const task = window.setTimeout(() => {
      setDebouncedQuery(query.trim().slice(0, 80));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(task);
  }, [catalogReady, debouncedQuery, query]);

  useEffect(() => {
    if (!catalogReady) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (filter !== "全部") params.set("filter", filter);
    const task = window.setTimeout(() => {
      setLoading(true);
      setLoadError("");
      fetch(`/api/themes?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("主题目录暂时无法读取");
          return response.json() as Promise<CatalogResponse>;
        })
        .then((data) => {
          setThemes(data.themes);
          setFeaturedTheme(data.featuredTheme);
          setStats(data.stats);
          setPagination(data.pagination);
          setSyncedAt(data.syncedAt);
          if (data.pagination.page !== page) setPage(data.pagination.page);
          const nextUrl = new URL(window.location.href);
          if (debouncedQuery) nextUrl.searchParams.set("q", debouncedQuery); else nextUrl.searchParams.delete("q");
          if (filter !== "全部") nextUrl.searchParams.set("filter", filter); else nextUrl.searchParams.delete("filter");
          if (data.pagination.page > 1) nextUrl.searchParams.set("page", String(data.pagination.page)); else nextUrl.searchParams.delete("page");
          window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setLoadError(error instanceof Error ? error.message : "主题目录暂时无法读取");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(task);
      controller.abort();
    };
  }, [catalogReady, debouncedQuery, filter, page]);

  const paginationItems = useMemo(() => pageItems(pagination.page, pagination.totalPages), [pagination.page, pagination.totalPages]);

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) return;
    setPage(nextPage);
    document.getElementById("themes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem(SKINDEX_SAVED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openInstall = (theme: Theme) => {
    setSelected(null);
    setInstallTheme(theme);
    setCopyState("idle");
  };

  const launchThemeUse = async (theme: Theme) => {
    let clipboardPrepared = false;
    if ((theme.install ?? getThemeInstallability(theme)).action === "guided-import") {
      try {
        await navigator.clipboard.writeText(buildNativeThemePayload(theme));
        clipboardPrepared = true;
      } catch {
        clipboardPrepared = false;
      }
    }
    window.location.assign(themeUseChatUrl(theme, clipboardPrepared));
  };

  const requestThemeUse = (theme: Theme) => {
    setSelected(null);
    if (!skillReady) {
      setPendingTheme(theme);
      return;
    }
    void launchThemeUse(theme);
  };

  const confirmSkillReady = (theme?: Theme | null) => {
    window.localStorage.setItem(SKINDEX_SKILL_READY_KEY, "confirmed");
    setSkillReady(true);
    setPendingTheme(null);
    setSkillInstallOpen(false);
    if (theme) void launchThemeUse(theme);
  };

  const resetSkillReady = () => {
    window.localStorage.removeItem(SKINDEX_SKILL_READY_KEY);
    setSkillReady(false);
  };

  const copyThemeSetting = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("error");
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
          publicationConsent: data.get("publicationConsent") === "on",
        }),
      });
      const result = await response.json() as {
        error?: string;
        submission?: { id: string; status: "pending"; public: false; publication: "review-required" };
      };
      if (!response.ok) throw new Error(result.error || "投稿保存失败");
      if (!result.submission || result.submission.public !== false || result.submission.status !== "pending") {
        throw new Error("投稿状态无法确认，请稍后重试");
      }
      form.reset();
      setSubmitState("success");
      setSubmitMessage(`投稿已进入审核队列，编号 ${result.submission.id.slice(0, 8)}。审核通过前不会出现在官网；我们只保存仓库信息，不复制你的素材。`);
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "投稿保存失败");
    }
  };

  const featured = featuredTheme ?? themes.find((theme) => theme.featured) ?? themes[0];

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SkinDex 首页"><span>S</span><strong>SkinDex</strong></a>
        <nav aria-label="主导航"><a href="#skill">主题 Skill</a><a href="#themes">真实主题</a><a href="#sources">数据来源</a><button onClick={() => setSubmitOpen(true)}>投稿</button></nav>
        <button className="submit-nav" onClick={() => setSkillInstallOpen(true)}>在 Codex 中安装 <span>↗</span></button>
      </header>

      <section className="hero real-hero" id="top">
        <div className="hero-copy">
          <div className="hero-label"><span>LIVE CATALOG</span><i>●</i> 公开来源 · 持久数据</div>
          <h1>真实主题，<br /><em>真实来源。</em></h1>
          <p>SkinDex 是你的 Codex 口袋皮肤图鉴：官网负责发现和创作，<b>$skindex</b> Skill 负责在 Codex 里对话切换。</p>
          <div className="hero-actions">
            <button onClick={() => setSkillInstallOpen(true)}>在 Codex 中安装 SkinDex <span>→</span></button>
            <a href="#themes">先浏览主题 ↓</a>
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
          <div className="floating-chip chip-two"><span>●</span> {featured?.sourceName === "SkinDex Lab" ? "参考图同人创作" : "预览来自原仓库"}</div>
        </div>
      </section>

      <section className="skill-section" id="skill">
        <div className="skill-intro">
          <span className="section-index">01 / CODEX SKILL</span>
          <div className="skill-route" aria-label="SkinDex 使用路径"><span>官网选主题</span><b>→</b><span>$skindex</span><b>→</b><span>Codex 应用</span></div>
          <h2>找到喜欢的主题，<br />交给 SkinDex 快捷导入。</h2>
          <p>官网负责发现主题，<b>$skindex</b> 负责验证、恢复点、复制并打开设置。安装一次，以后换肤只需在 Codex 原生窗口确认。</p>
          <div className="skill-actions">
            <button onClick={() => setSkillInstallOpen(true)}>安装 SkinDex <span>→</span></button>
            <span>一次安装 · 官网主题统一入口</span>
          </div>
        </div>
        <div className="conversation-grid" aria-label="SkinDex Skill 可以完成的对话">
          <a href={skindexChatUrl("应用官网的蓝色信使 2007 配色。")}>
            <span>01 / 应用主题</span><strong>“换成官网这个皮肤”</strong><p>读取主题资料，确认可用范围，再暂存并保留恢复点。</p><b>用 SkinDex 打开 ↗</b>
          </a>
          <a href={skindexChatUrl("参考我接下来发送的图片生成原创 Codex 主题。")}>
            <span>02 / 创作主题</span><strong>“参考这张图做一个”</strong><p>分析视觉语言，生成原创预览并提取可用配色。</p><b>用 SkinDex 打开 ↗</b>
          </a>
          <a href={skindexChatUrl("把刚生成的主题投稿到 SkinDex。")}>
            <span>03 / 投稿主题</span><strong>“把这个主题发到官网”</strong><p>先展示将公开的内容，得到确认后再进入审核队列。</p><b>用 SkinDex 打开 ↗</b>
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
            {filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => { setFilter(item); setPage(1); }} aria-pressed={filter === item}>{item}</button>)}
          </div>
          <span>{loading ? "正在读取…" : `${pagination.total} 个结果`}</span>
        </div>

        {loading ? (
          <div className="catalog-loading" aria-live="polite">正在从主题数据库读取真实目录…</div>
        ) : loadError ? (
          <div className="empty-state"><span>!</span><h3>目录暂时不可用</h3><p>{loadError}</p><button onClick={() => window.location.reload()}>重新加载</button></div>
        ) : themes.length > 0 ? (
          <>
            <div className="theme-grid">
              {themes.map((theme) => <ThemeCard key={theme.id} theme={theme} saved={saved.includes(theme.id)} onSave={() => toggleSaved(theme.id)} onOpen={() => setSelected(theme)} />)}
            </div>
            {pagination.totalPages > 1 && (
              <nav className="catalog-pagination" aria-label="主题目录分页">
                <button className="page-direction" onClick={() => changePage(pagination.page - 1)} disabled={!pagination.hasPrevious}>← 上一页</button>
                <div className="page-numbers">
                  {paginationItems.map((item) => typeof item === "number" ? (
                    <button key={item} className={item === pagination.page ? "active" : ""} onClick={() => changePage(item)} aria-current={item === pagination.page ? "page" : undefined}>{item}</button>
                  ) : <span key={item} aria-hidden="true">…</span>)}
                </div>
                <span className="page-summary">第 {pagination.page} / {pagination.totalPages} 页</span>
                <button className="page-direction" onClick={() => changePage(pagination.page + 1)} disabled={!pagination.hasNext}>下一页 →</button>
              </nav>
            )}
          </>
        ) : (
          <div className="empty-state"><span>⌕</span><h3>没有找到对应主题</h3><p>换个关键词，或清除当前筛选条件。</p><button onClick={() => { setQuery(""); setDebouncedQuery(""); setFilter("全部"); setPage(1); }}>查看全部主题</button></div>
        )}
      </section>

      <section className="sources-section" id="sources">
        <div className="market-heading">
          <div><span className="section-index">03 / SOURCES</span><h2>主题来源</h2></div>
          <p>公开项目保留原仓库链接；参考图生成主题由 SkinDex Lab 提炼原创预览与可导入配色。</p>
        </div>
        <div className="source-grid">
          <a href="https://github.com/robinli/codex-material-themes" target="_blank" rel="noreferrer"><span>01</span><h3>Codex Material Themes</h3><p>当前目录收录 7 款可通过 codex-theme-v1 导入的材质配色主题。</p><b>打开 GitHub ↗</b></a>
          <a href="https://github.com/xuhuanstudio/codex-styler" target="_blank" rel="noreferrer"><span>02</span><h3>Codex Styler</h3><p>开源主题编辑器、场景皮肤与互动伙伴系统。</p><b>打开 GitHub ↗</b></a>
          <a href="https://github.com/Wangnov/awesome-codex-skins" target="_blank" rel="noreferrer"><span>03</span><h3>Awesome Codex Skins</h3><p>.codexskin 标准、认证注册表和真实应用截图。</p><b>打开 GitHub ↗</b></a>
          <a href="#themes"><span>04</span><h3>SkinDex Lab</h3><p>把用户参考图转化为原创主题概念、预览和可导入配色。</p><b>查看实验主题 ↑</b></a>
        </div>
        {syncedAt && <p className="sync-note">数据库响应时间：{new Date(syncedAt).toLocaleString("zh-CN")} · 星标为 2026-07-18 核验快照，最新数据以源仓库为准</p>}
      </section>

      <section className="creator-banner" id="creators">
        <div className="creator-dots" aria-hidden="true"><span>G</span><span>H</span><span>✓</span></div>
        <div><span className="section-index">04 / SUBMIT</span><h2>让你的主题进入目录。</h2><p>可以提交 GitHub 仓库，也可以在 Codex 里通过 Skill 提交生成主题。两种方式都先进入审核，审核通过前不会公开。</p></div>
        <button onClick={() => setSubmitOpen(true)}>提交主题仓库 <span>↗</span></button>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span>S</span><strong>SkinDex</strong></a>
        <p>公开浏览 · 来源可追溯 · 不强绑 ChatGPT 登录</p>
        <div><a href="#skill">安装 Skill</a><a href="#sources">数据来源</a><a href="#creators">提交主题</a><a href="/privacy">隐私</a><a href="/terms">条款</a><a href="/support">支持</a><a href="#top">回到顶部 ↑</a></div>
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
                {getInstallGuide(selected).canUseInCodex ? (
                  <button className="primary-action" onClick={() => requestThemeUse(selected)}>{skillReady ? "用 SkinDex 快捷导入" : "安装 SkinDex 后导入"} →</button>
                ) : (
                  <button className="primary-action is-secondary" onClick={() => openInstall(selected)}>查看适配说明 →</button>
                )}
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
              {guide.canUseInCodex && (
                <button className="skill-use-link" onClick={() => requestThemeUse(installTheme)}>{skillReady ? "在 Codex 中准备主题" : "安装 SkinDex 后继续"} →</button>
              )}
              <ol className="install-steps">
                {guide.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><p>{step}</p></li>)}
              </ol>
              {guide.kind === "copy" && guide.copyValue ? (
                <>
                  <textarea className="theme-code" readOnly value={guide.copyValue} aria-label="完整主题设置" />
                  <button className="install-primary" onClick={() => copyThemeSetting(guide.copyValue!)}>
                    {copyState === "copied" ? "已复制，请在 Codex 外观中导入 ✓" : "备用：手动复制主题设置"}
                  </button>
                  {copyState === "error" && <p className="install-error">浏览器未允许复制，请手动选择上方完整设置。</p>}
                </>
              ) : (
                <div className="install-links">
                  <a className="install-primary" href={guide.primaryUrl} target="_blank" rel="noreferrer">{guide.primaryLabel}</a>
                  <a className="install-secondary" href={guide.secondaryUrl} target="_blank" rel="noreferrer">{guide.secondaryLabel}</a>
                </div>
              )}
              <p className="install-source">{guide.kind === "copy" ? "推荐使用 SkinDex 流程，它会创建恢复点。手动复制只作为备用，不会记录 SkinDex 恢复点；两种方式都需要你在 Codex 内确认。" : "本站只展示可追溯的原始来源，不重新打包、不执行第三方文件，也不声称当前已经支持一键导入。"}</p>
            </section>
          </div>
        );
      })()}

      {pendingTheme && !skillInstallOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPendingTheme(null)}>
          <section className="skill-gate-modal" role="dialog" aria-modal="true" aria-labelledby="skill-gate-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setPendingTheme(null)} aria-label="关闭 SkinDex 安装确认">×</button>
            <span className="section-index">FIRST USE · INSTALL CHECK</span>
            <h2 id="skill-gate-title">使用主题前，先确认 SkinDex v0.5.2</h2>
            <p>官网无法读取你电脑上的 Codex 技能列表。未安装时直接打开主题，会让 Codex 无效搜索并浪费时间；请选择你的真实状态。</p>
            <div className="skill-gate-options">
              <button className="install-primary" onClick={() => setSkillInstallOpen(true)}>安装或更新 SkinDex →</button>
              <button className="install-secondary" onClick={() => confirmSkillReady(pendingTheme)}>我已安装：在 Codex 中打开主题 →</button>
            </div>
            <p className="install-source">当前主题：<b>{pendingTheme.name}</b>。只有你确认已安装后，官网才会打开主题任务。</p>
          </section>
        </div>
      )}

      {skillInstallOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSkillInstallOpen(false)}>
          <section className="skill-install-modal" role="dialog" aria-modal="true" aria-labelledby="skill-install-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSkillInstallOpen(false)} aria-label="关闭 Skill 安装说明">×</button>
            <span className="section-index">GUIDED INSTALL · GITHUB VERIFIED</span>
            <h2 id="skill-install-title">安装或更新一次，以后主题直接用</h2>
            <p>点击后会打开 Codex，并由内置的 Skill Installer 从 SkinDex 官方 GitHub 安装。浏览器不会下载文件，也不会静默修改你的电脑。</p>
            <ol className="install-steps skill-install-steps">
              <li><span>01</span><p>点击“用 Codex 安装”</p></li>
              <li><span>02</span><p>允许 Skill Installer 完成安装</p></li>
              <li><span>03</span><p>开启新对话，使用 $skindex</p></li>
            </ol>
            <div className="skill-downloads">
              <a className="install-primary" href={skillInstallerChatUrl()}>用 Codex 安装 →</a>
              <a className="install-secondary" href={skillSourceUrl} target="_blank" rel="noreferrer">查看 GitHub 源码 ↗</a>
            </div>
            {pendingTheme && <button className="skill-ready-confirm" onClick={() => confirmSkillReady(pendingTheme)}>我已安装：在 Codex 中打开主题 →</button>}
            {skillReady && !pendingTheme && <button className="skill-reset-button" onClick={resetSkillReady}>这台设备找不到 Skill？重新进入安装流程</button>}
            <p className="install-source">唯一发布源：<a href={githubRepoUrl} target="_blank" rel="noreferrer">GitHub ↗</a>。安装后开启新对话，输入：$skindex 帮我从官网挑一个主题。</p>
          </section>
        </div>
      )}

      {submitOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => { setSubmitOpen(false); setSubmitState("idle"); }}>
          <section className="submit-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => { setSubmitOpen(false); setSubmitState("idle"); }} aria-label="关闭投稿窗口">×</button>
            <span className="section-index">GITHUB SUBMISSION</span>
            <h2 id="submit-title">提交真实主题仓库</h2>
            <p>首版不要求账号登录。提交只会进入私有审核队列；我们核验仓库归属、许可、主题文件和真实预览后，审核通过才会公开。</p>
            <div className="submission-standard" aria-label="SkinDex 统一上架标准">
              <b>统一上架标准</b>
              <span>横向预览图，建议 16:9</span>
              <span>标题最多 64 字符</span>
              <span>简介最多 180 字符</span>
              <span>标签最多 4 个</span>
              <span>所有卡片使用统一布局</span>
            </div>
            {submitState === "success" ? (
              <div className="success-state"><span>✓</span><h3>已保存到审核队列</h3><p>{submitMessage}</p><button onClick={() => { setSubmitOpen(false); setSubmitState("idle"); }}>完成</button></div>
            ) : (
              <form onSubmit={submitTheme}>
                <label>主题名称<input name="themeName" required minLength={2} maxLength={64} placeholder="例如：Shanghai After Dark" /></label>
                <label>作者名称<input name="authorName" required minLength={2} maxLength={60} placeholder="你的 GitHub 名称" /></label>
                <label>GitHub 仓库<input name="repoUrl" type="url" required pattern="https://github\.com/.+/.+" placeholder="https://github.com/owner/repo" /></label>
                <label>支持平台<select name="platform" defaultValue="桌面端"><option>桌面端</option><option>CLI</option><option>全平台</option></select></label>
                <label className="notes-field">补充说明<textarea name="notes" maxLength={500} placeholder="主题格式、验证版本或安装方式（可选）" /></label>
                <label className="review-consent"><input name="publicationConsent" type="checkbox" required /><span>我同意将主题名称、作者名称、仓库链接、平台和补充说明提交审核；只有审核通过后，这些信息才会在官网公开。</span></label>
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
