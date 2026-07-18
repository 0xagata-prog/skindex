import { LegalShell } from "../legal-shell";

export const metadata = { title: "使用条款 — SkinDex", description: "SkinDex 主题目录、第三方来源与投稿的使用边界。" };

export default function TermsPage() {
  return (
    <LegalShell eyebrow="TERMS" title="使用条款" intro="SkinDex 是社区主题的索引和安全导入辅助工具，不是 OpenAI、腾讯或任何第三方主题项目的官方产品。">
      <section><h2>目录与第三方内容</h2><p>主题名称、预览、许可、兼容性和下载链接以各来源仓库为准。SkinDex 尽力核验来源，但不替代你阅读第三方许可、安装说明和安全提示。</p></section>
      <section><h2>导入边界</h2><p>Skill 只对已支持的数据格式执行验证、暂存和恢复点管理，不会静默修改 Codex，也不会执行主题 Manifest 中的命令、脚本或 Hook。最终外观导入必须由用户在 Codex 中确认。</p></section>
      <section><h2>投稿保证</h2><p>投稿者应有权公开所提交的仓库信息、预览和主题内容，不得提交恶意代码、私人资料、误导性来源或侵犯他人权利的素材。SkinDex 可以拒绝、下架或更正不符合要求的内容。</p></section>
      <section><h2>同人主题</h2><p>含角色、品牌或其他第三方元素的主题应明确标注为非官方同人创作。相关名称、角色和商标仍归各权利人所有，收录不代表授权、合作或背书。</p></section>
      <section><h2>可用性</h2><p>本项目按现状提供，目录、适配器和第三方链接可能变化。应用主题前请保留恢复点；对于第三方安装器或未支持适配器，SkinDex 只提供来源链接，不代为执行。</p></section>
    </LegalShell>
  );
}
