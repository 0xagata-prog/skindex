"use client";

/* eslint-disable @next/next/no-img-element -- theme previews may come from verified external repositories */

import { FormEvent, useState } from "react";
import type { ThemeAdminSnapshot } from "../../../lib/theme-admin";

type Revision = { id: string; action: string; editorEmail: string; createdAt: string };

export function ThemeManager({ id, theme, revisions }: { id: string; theme: ThemeAdminSnapshot; revisions: Revision[] }) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  const request = async (url: string, init: RequestInit) => {
    setState("working");
    setMessage("");
    try {
      const response = await fetch(url, init);
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "主题管理操作失败");
      window.location.reload();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "主题管理操作失败");
    }
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void request(`/api/review/themes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        author: data.get("author"),
        authorUrl: data.get("authorUrl"),
        platform: data.get("platform"),
        mode: data.get("mode"),
        description: data.get("description"),
        tags: String(data.get("tags") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
        palette: String(data.get("palette") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
        previewUrl: data.get("previewUrl"),
        sourceUrl: data.get("sourceUrl"),
        downloadUrl: data.get("downloadUrl"),
        sourceName: data.get("sourceName"),
        sourceRepo: data.get("sourceRepo"),
        stars: Number(data.get("stars")),
        license: data.get("license"),
        verifiedVersion: data.get("verifiedVersion"),
        featured: data.get("featured") === "on",
        status: data.get("status"),
      }),
    });
  };

  const uploadPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void request(`/api/review/themes/${encodeURIComponent(id)}/preview`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
  };

  const restore = (revision: Revision) => {
    if (!window.confirm(`确认恢复 ${new Date(revision.createdAt).toLocaleString("zh-CN")} 前的版本？当前版本也会自动保存。`)) return;
    void request(`/api/review/themes/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", revisionId: revision.id }),
    });
  };

  return (
    <article className="managed-theme-card">
      <div className="managed-theme-summary">
        <img src={theme.previewUrl} alt={`${theme.name} 当前预览`} loading="lazy" />
        <div>
          <div className="review-meta"><span>{theme.platform}</span><span>{theme.mode}</span><span>{theme.status === "approved" ? "已上架" : "已下架"}</span>{theme.featured && <span>精选</span>}</div>
          <h3>{theme.name}</h3>
          <p>by {theme.author} · {theme.sourceName}</p>
        </div>
      </div>

      <details>
        <summary>编辑主题资料</summary>
        <form className="theme-editor-form" onSubmit={save}>
          <label>主题名称<input name="name" defaultValue={theme.name} required minLength={2} maxLength={64} /></label>
          <label>作者<input name="author" defaultValue={theme.author} required minLength={2} maxLength={60} /></label>
          <label>作者地址<input name="authorUrl" type="url" defaultValue={theme.authorUrl} required /></label>
          <label>平台<select name="platform" defaultValue={theme.platform}><option>桌面端</option><option>CLI</option><option>全平台</option></select></label>
          <label>模式<select name="mode" defaultValue={theme.mode}><option>深色</option><option>浅色</option><option>双模式</option></select></label>
          <label>状态<select name="status" defaultValue={theme.status}><option value="approved">已上架</option><option value="unpublished">已下架</option></select></label>
          <label className="full-field">简介<textarea name="description" defaultValue={theme.description} required maxLength={180} /></label>
          <label className="full-field">标签（逗号分隔，最多4个）<input name="tags" defaultValue={theme.tags.join(", ")} required /></label>
          <label className="full-field">色板（3–6个十六进制颜色）<input name="palette" defaultValue={theme.palette.join(", ")} required /></label>
          <label className="full-field">预览图地址<input name="previewUrl" defaultValue={theme.previewUrl} required /></label>
          <label className="full-field">来源地址<input name="sourceUrl" type="url" defaultValue={theme.sourceUrl} required /></label>
          <label className="full-field">下载地址<input name="downloadUrl" type="url" defaultValue={theme.downloadUrl} required /></label>
          <label>来源名称<input name="sourceName" defaultValue={theme.sourceName} required maxLength={80} /></label>
          <label>来源仓库<input name="sourceRepo" defaultValue={theme.sourceRepo} required maxLength={160} /></label>
          <label>GitHub 星标<input name="stars" type="number" min={0} defaultValue={theme.stars} required /></label>
          <label>许可<input name="license" defaultValue={theme.license} required maxLength={120} /></label>
          <label>验证信息<input name="verifiedVersion" defaultValue={theme.verifiedVersion} required maxLength={120} /></label>
          <label className="featured-field"><input name="featured" type="checkbox" defaultChecked={theme.featured} />设为精选主题</label>
          <button className="save-theme-button" type="submit" disabled={state === "working"}>保存修改</button>
        </form>
      </details>

      <details>
        <summary>替换预览图</summary>
        <form className="preview-upload-form" onSubmit={uploadPreview}>
          <input name="preview" type="file" accept="image/png,image/jpeg,image/webp" required />
          <button type="submit" disabled={state === "working"}>上传并替换</button>
          <p>PNG、JPEG 或 WebP，不超过700KB，至少960×540，建议16:9。旧图会保留给历史版本恢复。</p>
        </form>
      </details>

      <details>
        <summary>版本历史（{revisions.length}）</summary>
        {revisions.length ? <ol className="revision-list">{revisions.map((revision) => (
          <li key={revision.id}><div><b>{revision.action}</b><span>{new Date(revision.createdAt).toLocaleString("zh-CN")} · {revision.editorEmail}</span></div><button onClick={() => restore(revision)} disabled={state === "working"}>恢复</button></li>
        ))}</ol> : <p className="no-revisions">这个主题还没有后台修改记录。</p>}
      </details>
      {state === "error" && <p className="manager-error" role="alert">{message}</p>}
    </article>
  );
}
