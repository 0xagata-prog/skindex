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
    adapter: "dream-skin-runtime-v1" | "codex-native-v1" | "codexskin-runtime-v1" | "codex-styler-v1";
    action: "guided-import" | "view-source";
    requiresUserConfirmation: true;
    rollback: "restore-point" | "upstream-restore" | "unavailable";
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

const filters = ["全部", "完整皮肤", "轻量配色", "桌面端", "CLI", "深色", "浅色", "双模式"] as const;

const githubRepoUrl = "https://github.com/0xagata-prog/skindex";
const skillSourceUrl = `${githubRepoUrl}/tree/v0.6.0/skill`;
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
  if (install.supportLevel === "full-skin-source") {
    return {
      kind: "skin",
      buttonLabel: "查看完整皮肤",
      eyebrow: "完整皮肤 · Dream Skin",
      title: `${theme.name} 已有真实运行版本`,
      description: "这不是一张概念图，也不只是换颜色：源项目通过本机 CDP 提供连续背景、原生交互控件、主题切换和恢复。SkinDex 正在为它建设统一审核与安全适配器，完成前先保留原项目安装边界。",
      steps: ["查看真实预览、平台说明与素材权利", "按源项目说明安装或切换", "等待 SkinDex Runtime 完成统一的一键流程"],
      primaryUrl: theme.sourceUrl,
      primaryLabel: "打开 Dream Skin ↗",
      secondaryUrl: theme.downloadUrl,
      secondaryLabel: "查看快速开始 ↗",
      canUseInCodex: false,
      statusLabel: "完整皮肤 · 源项目可用",
      supportLevel: install.supportLevel,
    };
  }
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
      if (!data.getAll("capabilities").length) throw new Error("请至少选择一项真实可用的皮肤能力");
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeName: data.get("themeName"),
          authorName: data.get("authorName"),
          repoUrl: data.get("repoUrl"),
          platform: data.get("platform"),
          engine: data.get("engine"),
          capabilities: data.getAll("capabilities"),
          verifiedInCodex: data.get("verifiedInCodex") === "on",
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
      setSubmitMessage(`投稿已进入审核队列，编号 ${result.submission.id.slice(0, 8)}。审核通过前不会出现在官网；我们只保存仓库、引擎和能力声明，不复制你的素材。`);
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
        <nav aria-label="主导航"><a href="#skill">SkinDex Skill</a><a href="#themes">皮肤目录</a><a href="#sources">运行基座</a><button onClick={() => setSubmitOpen(true)}>投稿</button></nav>
        <button className="submit-nav" onClick={() => setSkillInstallOpen(true)}>在 Codex 中安装 <span>↗</span></button>
      </header>

      <section className="hero real-hero" id="top">
        <div className="hero-copy">
          <div className="hero-label"><span>CODEX SKIN INDEX</span><i>●</i> 完整皮肤 · 轻量配色 · 真实来源</div>
          <h1>好玩的 Codex 皮肤，<br /><em>都收进一个口袋。</em></h1>
          <p>SkinDex 不再只是做配色：官网聚合 Dream Skin 等真实皮肤成品，<b>$skindex</b> 负责发现、创作、投稿，并逐步接入安全的一键切换。</p>
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
            <span><strong>{loading ? "—" : stats.themes}</strong> 个皮肤与配色</span>
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
          <span className="section-index">01 / AGGREGATION LAYER</span>
          <div className="skill-route" aria-label="SkinDex 使用路径"><span>官网聚合成品</span><b>→</b><span>$skindex 编排</span><b>→</b><span>运行基座应用</span></div>
          <h2>官网是皮肤库，<br />Skill 是统一入口。</h2>
          <p>Dream Skin 负责真实界面运行，SkinDex 负责成品聚合、来源核验、能力标注、创作投稿和未来的一键切换。轻量配色仍可使用原生导入。</p>
          <div className="skill-actions">
            <button onClick={() => setSkillInstallOpen(true)}>安装 SkinDex <span>→</span></button>
            <span>一次安装 · 官网主题统一入口</span>
          </div>
        </div>
        <div className="conversation-grid" aria-label="SkinDex Skill 可以完成的对话">
          <a href={skindexChatUrl("推荐官网里已经实机验证的完整皮肤，并说明我的系统能不能用。")}>
            <span>01 / 发现皮肤</span><strong>“给我挑一个真的能用的”</strong><p>按完整皮肤、轻量配色和运行基座分组，不把概念图冒充成品。</p><b>用 SkinDex 打开 ↗</b>
          </a>
          <a href={skindexChatUrl("参考我接下来发送的图片生成原创 Codex 主题。")}>
            <span>02 / 创作皮肤</span><strong>“参考这张图做一个”</strong><p>先明确要做完整 Dream Skin，还是只做可原生导入的轻量配色。</p><b>用 SkinDex 打开 ↗</b>
          </a>
          <a href={skindexChatUrl("把刚生成的主题投稿到 SkinDex。")}>
            <span>03 / 投稿成品</span><strong>“把刚做好的皮肤发到官网”</strong><p>识别引擎与能力，展示投稿清单，得到明确同意后进入私有审核。</p><b>用 SkinDex 打开 ↗</b>
          </a>
        </div>
      </section>

      <section className="market" id="themes">
        <div className="market-heading">
          <div><span className="section-index">02 / SKIN CATALOG</span><h2>皮肤目录</h2></div>
          <p>“完整皮肤”和“轻量配色”分开标注；预览、星标、许可、运行基座与验证范围都来自真实来源。</p>
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
          <div><span className="section-index">03 / RUNTIME & SOURCES</span><h2>运行基座与来源</h2></div>
          <p>SkinDex 是聚合层，不冒充底层运行时；每个成品都保留原作者、原仓库、许可和真实可用范围。</p>
        </div>
        <div className="source-grid">
          <a href="https://github.com/Fei-Away/Codex-Dream-Skin" target="_blank" rel="noreferrer"><span>01</span><h3>Codex Dream Skin</h3><p>当前完整皮肤核心基座：本机 CDP 注入、原生控件、主题切换与恢复，支持 macOS / Windows。</p><b>打开核心仓库 ↗</b></a>
          <a href="https://github.com/robinli/codex-material-themes" target="_blank" rel="noreferrer"><span>02</span><h3>轻量配色来源</h3><p>保留可通过 codex-theme-v1 导入的材质配色，但不再把它们称作完整 UI 皮肤。</p><b>打开 GitHub ↗</b></a>
          <a href="#themes"><span>03</span><h3>SkinDex Catalog</h3><p>统一收录第三方成品、创作者投稿和原创主题，并标注是否已实机验证。</p><b>查看目录 ↑</b></a>
          <a href="#creators"><span>04</span><h3>创作者投稿</h3><p>用 Dream Skin 做完后，可由 Skill 询问是否投稿；未明确同意时始终留在本地。</p><b>查看投稿方式 ↓</b></a>
        </div>
        {syncedAt && <p className="sync-note">数据库响应时间：{new Date(syncedAt).toLocaleString("zh-CN")} · 星标为 2026-07-18 核验快照，最新数据以源仓库为准</p>}
      </section>

      <section className="creator-banner" id="creators">
        <div className="creator-dots" aria-hidden="true"><span>G</span><span>H</span><span>✓</span></div>
        <div><span className="section-index">04 / SUBMIT</span><h2>做完皮肤，就把它收进 SkinDex。</h2><p>Dream Skin 成品可以提交 GitHub 仓库；用 Skill 创作完成后，它也会询问是否投稿。两种方式都先进入私有审核，不会自动公开。</p></div>
        <button onClick={() => setSubmitOpen(true)}>提交皮肤仓库 <span>↗</span></button>
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
            <h2 id="skill-gate-title">使用主题前，先确认 SkinDex v0.6.0</h2>
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
            <span className="section-index">SKIN REPOSITORY SUBMISSION</span>
            <h2 id="submit-title">提交完整皮肤或轻量配色</h2>
            <p>首版不要求账号登录。请如实标注运行引擎和已实现能力；我们核验仓库归属、许可、文件与真实预览后，审核通过才会公开。</p>
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
                <label>运行引擎<select name="engine" defaultValue="dream-skin"><option value="dream-skin">Dream Skin 完整皮肤</option><option value="skindex-native">Codex 原生轻量配色</option><option value="other">其他（人工核验）</option></select></label>
                <fieldset className="capability-field"><legend>已经实现的能力（至少一项）</legend><label><input type="checkbox" name="capabilities" value="background" />连续背景</label><label><input type="checkbox" name="capabilities" value="palette" />配色</label><label><input type="checkbox" name="capabilities" value="icons" />图标</label><label><input type="checkbox" name="capabilities" value="layout" />布局</label><label><input type="checkbox" name="capabilities" value="motion" />动效</label><label><input type="checkbox" name="capabilities" value="companion" />桌宠 / 伙伴</label><label><input type="checkbox" name="capabilities" value="custom-ui" />自定义 UI</label></fieldset>
                <label className="review-consent"><input name="verifiedInCodex" type="checkbox" /><span>我已经在真实 Codex 中验证过；未勾选也可以投稿，但会标记为“待实机验证”。</span></label>
                <label className="notes-field">补充说明<textarea name="notes" maxLength={500} placeholder="主题格式、验证版本或安装方式（可选）" /></label>
                <label className="review-consent"><input name="publicationConsent" type="checkbox" required /><span>我同意将主题名称、作者、仓库、引擎、能力声明和补充说明提交审核；只有审核通过后才会在官网公开。</span></label>
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
