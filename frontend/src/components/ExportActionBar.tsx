import React, { useState } from 'react';
import { Copy, Check, Download, Printer, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { DeskData } from './OfficeFloor';

interface ExportActionBarProps {
  query: string;
  content: string;
  team: DeskData[];
  promptCoachTip: string;
  showRecipeCard: boolean;
  onToggleRecipeCard: () => void;
  onRegenerate?: () => void; // 마지막 답에만 준다
  subQuestions?: string[];
  intent?: string;
}

const icon =
  'h-8 w-8 rounded-md inline-flex items-center justify-center text-faint hover:text-ink hover:bg-sunken transition-colors duration-200 ease-out';

// 답 아래 작업 줄: 채팅 서비스처럼 아이콘만 두고, 이름은 툴팁과 aria-label로 준다.
export const ExportActionBar: React.FC<ExportActionBarProps> = ({
  query,
  content,
  team,
  promptCoachTip,
  showRecipeCard,
  onToggleRecipeCard,
  onRegenerate,
  subQuestions,
  intent,
}) => {
  const [copied, setCopied] = useState(false);

  const handleDownloadMarkdown = () => {
    const teamHeader = team.map((t) => `- ${t.character_name} (${t.name}): ${t.badge_label}`).join('\n');
    const sqHeader =
      subQuestions && subQuestions.length > 0
        ? `\n## 핵심 의도 및 하위 질문\n${intent ? `- 의도: ${intent}\n` : ''}${subQuestions.map((sq, i) => `${i + 1}. ${sq}`).join('\n')}\n`
        : '';
    const md =
      `# 작업 결과\n\n` +
      `- 요청: ${query}\n` +
      `- 작성: ${new Date().toLocaleString('ko-KR')}\n` +
      sqHeader +
      (team.length > 0 ? `\n## 참여 전문가\n${teamHeader}\n` : '') +
      `\n---\n\n${content}\n\n---\n\n` +
      (promptCoachTip ? `## 다음엔 이렇게 질문해 보세요\n${promptCoachTip}\n\n` : '') +
      `Gon · 전국민 AI 평준화\n`;
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `gon-${query.slice(0, 15).replace(/[^a-zA-Z0-9가-힣]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 권한이 없으면 조용히 넘어간다. */
    }
  };

  return (
    <div className="no-print flex items-center gap-0.5 -ml-1.5">
      <button type="button" onClick={handleCopyContent} className={icon} aria-label={copied ? '복사됨' : '답 복사'} title={copied ? '복사됨' : '답 복사'}>
        {copied ? <Check className="w-4 h-4 text-accent" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
      </button>
      {onRegenerate && (
        <button type="button" onClick={onRegenerate} className={icon} aria-label="다시 생성" title="다시 생성">
          <RotateCcw className="w-4 h-4" aria-hidden />
        </button>
      )}
      <button
        type="button"
        onClick={onToggleRecipeCard}
        aria-pressed={showRecipeCard}
        className={`${icon} ${showRecipeCard ? 'text-ink bg-sunken' : ''}`}
        aria-label={showRecipeCard ? '공유 카드 닫기' : '공유 카드'}
        title={showRecipeCard ? '공유 카드 닫기' : '공유 카드'}
      >
        <ImageIcon className="w-4 h-4" aria-hidden />
      </button>
      <button type="button" onClick={handleDownloadMarkdown} className={icon} aria-label="마크다운으로 저장" title="마크다운(.md)으로 저장">
        <Download className="w-4 h-4" aria-hidden />
      </button>
      <button type="button" onClick={() => window.print()} className={icon} aria-label="PDF로 저장·인쇄" title="인쇄 창에서 'PDF로 저장'을 고를 수 있어요">
        <Printer className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
};
