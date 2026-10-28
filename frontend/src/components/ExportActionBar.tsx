import React, { useState } from 'react';
import { Copy, Check, Download, Image as ImageIcon } from 'lucide-react';
import { DeskData } from './OfficeFloor';

interface ExportActionBarProps {
  query: string;
  content: string;
  team: DeskData[];
  promptCoachTip: string;
  showRecipeCard: boolean;
  onToggleRecipeCard: () => void;
}

const btn =
  'inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line bg-surface text-sm text-ink hover:border-faint transition-colors duration-200';

export const ExportActionBar: React.FC<ExportActionBarProps> = ({
  query,
  content,
  team,
  promptCoachTip,
  showRecipeCard,
  onToggleRecipeCard,
}) => {
  const [copied, setCopied] = useState(false);

  const handleDownloadMarkdown = () => {
    const teamHeader = team.map((t) => `- ${t.character_name} (${t.name}): ${t.badge_label}`).join('\n');
    const md =
      `# 작업 결과 보고서\n\n` +
      `- 요청: ${query}\n` +
      `- 작성: ${new Date().toLocaleString('ko-KR')}\n\n` +
      `## 참여 전문가\n${teamHeader}\n\n` +
      `---\n\n${content}\n\n---\n\n` +
      `## 다음엔 이렇게 질문해 보세요\n${promptCoachTip}\n\n` +
      `SkillBridge · 전국민 AI 평준화\n`;

    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `skillbridge-${query.slice(0, 15).replace(/[^a-zA-Z0-9가-힣]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 권한이 없으면 조용히 넘어간다. 복사됨 표시를 띄우지 않는 것이 정직하다. */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleCopyContent} className={btn}>
        {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
        <span>{copied ? '복사됨' : '본문 복사'}</span>
      </button>
      <button type="button" onClick={handleDownloadMarkdown} className={btn}>
        <Download className="w-4 h-4" />
        <span>파일로 저장</span>
      </button>
      <button
        type="button"
        onClick={onToggleRecipeCard}
        aria-pressed={showRecipeCard}
        className={`${btn} ${showRecipeCard ? '!border-ink' : ''}`}
      >
        <ImageIcon className="w-4 h-4" />
        <span>{showRecipeCard ? '공유 카드 닫기' : '공유 카드 만들기'}</span>
      </button>
    </div>
  );
};
