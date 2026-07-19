import { LegalShell } from "../legal-shell";

export const metadata = { title: "支持与反馈 — SkinDex", description: "SkinDex 安装、主题来源、投稿撤回和安全问题反馈入口。" };

export default function SupportPage() {
  return (
    <LegalShell eyebrow="SUPPORT" title="支持与反馈" intro="安装失败、来源错误、投稿撤回和安全问题都可以从这里进入正确渠道。">
      <section><h2>先做快速检查</h2><ul><li>确认 Skill 来自固定版本的官方 GitHub 仓库。</li><li>安装后开启一个新 Codex 对话，再输入 <code>$skindex</code>。</li><li>SkinDex 会复制主题并打开 Codex 设置；原生主题仍需在 Appearance → Import 中粘贴并完成一次确认。</li></ul></section>
      <section><h2>一般问题与内容更正</h2><p>请在 <a href="https://github.com/0xagata-prog/skindex/issues/new" target="_blank" rel="noreferrer">GitHub Issues</a> 提交可公开的问题描述、复现步骤和主题链接。不要上传私人图片、邮箱、API Key、访问令牌或未公开投稿内容。</p></section>
      <section><h2>安全问题</h2><p>不要在公开 Issue 中披露可被利用的漏洞细节。请先使用 GitHub 仓库的 Security / Report a vulnerability 私密渠道；如果该入口暂不可用，只提交不含利用细节的联络请求。</p></section>
      <section><h2>投稿撤回</h2><p>提供审核编号的前 8 位、主题名称和公开作者标签即可帮助定位。涉及私人预览时，先发送不含图片的撤回请求，等待私密联络方式。</p></section>
    </LegalShell>
  );
}
