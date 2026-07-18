import { LegalShell } from "../legal-shell";

export const metadata = { title: "隐私说明 — SkinDex", description: "SkinDex 浏览、投稿与审核流程中的数据处理说明。" };

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="PRIVACY" title="隐私说明" intro="SkinDex 默认公开浏览，不要求用户登录。只有投稿与所有者审核会产生服务端数据。">
      <section><h2>浏览网站</h2><p>浏览目录无需 ChatGPT 或其他账号。网站会在你的浏览器本地保存收藏主题和“已安装 Skill”确认状态；这些信息不会由 SkinDex 上传。</p></section>
      <section><h2>提交 GitHub 仓库</h2><p>投稿时会保存你主动填写的主题名称、作者名称、公开仓库地址、平台、说明、同意状态和提交时间。资料在审核通过前不会进入公开目录。</p></section>
      <section><h2>通过 Skill 提交生成主题</h2><p>只有在你看到上传内容并再次明确同意后，Skill 才会上传缩略图、名称、作者标签、平台、色板和说明。图片限制为 700 KB，并拒绝超大尺寸及 EXIF、XMP、文本注释等元数据。待审预览仅审核账号可见；拒绝投稿时会删除预览对象，审核通过后预览会成为主题公开内容。</p></section>
      <section><h2>账号与审核</h2><p>公开浏览和投稿不连接 GPT API。审核后台使用 ChatGPT 登录识别唯一授权的站点所有者；其他账号没有审核权限。</p></section>
      <section><h2>删除或更正</h2><p>需要撤回投稿、更正作者信息或报告误收录时，请通过 <a href="/support">支持页面</a> 联系项目。公开 GitHub Issue 中不要填写私人图片、邮箱、令牌或其他敏感信息。</p></section>
    </LegalShell>
  );
}
