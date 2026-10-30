import React, { useState } from 'react';
import { getTheme } from '../theme';
import { Copy, Check, Download } from 'lucide-react';
import { DeskData } from './OfficeFloor';

interface PromptRecipeCardProps {
  query: string;
  team: DeskData[];
  promptCoachTip: string;
}

const btn =
  'inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line bg-surface text-sm text-ink hover:border-faint transition-colors duration-200';

// 캔버스에 공유용 이미지를 그린다. 화면 카드와 같은 팔레트.
function drawCard(query: string, team: DeskData[], tip: string): string | null {
  const canvas = document.createElement('canvas');
  const scale = 2;
  const W = 640;
  const H = 400;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);

  const font = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
  const dark = getTheme() === 'dark';
  const K = dark
    ? { bg: '#262523', line: '#383633', faint: '#7a756b', ink: '#f0ece1', box: '#1a1918', accent: '#d97757' }
    : { bg: '#ffffff', line: '#e6e4dd', faint: '#8e8b82', ink: '#1f1e1d', box: '#f3f1eb', accent: '#d97757' };
  ctx.fillStyle = K.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = K.line;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.fillStyle = K.faint;
  ctx.font = `500 12px ${font}`;
  ctx.fillText('요청', 32, 48);
  ctx.fillStyle = K.ink;
  ctx.font = `600 18px ${font}`;
  ctx.fillText(query.length > 34 ? `${query.slice(0, 33)}…` : query, 32, 74);

  ctx.fillStyle = K.faint;
  ctx.font = `500 12px ${font}`;
  ctx.fillText('참여 전문가', 32, 112);
  ctx.fillStyle = K.ink;
  ctx.font = `500 14px ${font}`;
  ctx.fillText(team.map((t) => t.character_name).join(' · '), 32, 134);

  ctx.fillStyle = K.box;
  ctx.fillRect(32, 160, W - 64, 168);
  ctx.fillStyle = K.accent;
  ctx.font = `600 13px ${font}`;
  ctx.fillText('다음엔 이렇게 질문해 보세요', 48, 188);

  ctx.fillStyle = K.ink;
  ctx.font = `400 14px ${font}`;
  let line = '';
  let y = 214;
  for (const ch of tip) {
    if (ctx.measureText(line + ch).width > W - 96) {
      ctx.fillText(line, 48, y);
      line = ch === ' ' ? '' : ch;
      y += 22;
      if (y > 316) break;
    } else {
      line += ch;
    }
  }
  if (y <= 316) ctx.fillText(line, 48, y);

  ctx.fillStyle = K.faint;
  ctx.font = `400 12px ${font}`;
  ctx.fillText('Gon · 전국민 AI 평준화', 32, H - 28);

  return canvas.toDataURL('image/png');
}

export const PromptRecipeCard: React.FC<PromptRecipeCardProps> = ({ query, team, promptCoachTip }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCardText = async () => {
    const text =
      `[프롬프트 레시피]\n\n요청: "${query}"\n참여 전문가: ${team.map((t) => `${t.character_name}(${t.name})`).join(', ')}\n\n` +
      `다음엔 이렇게 질문해 보세요:\n${promptCoachTip}\n\nGon · 전국민 AI 평준화`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 권한이 없으면 복사됨 표시를 띄우지 않는다 */
    }
  };

  const handleDownloadImage = () => {
    const href = drawCard(query, team, promptCoachTip);
    if (!href) return;
    const link = document.createElement('a');
    link.download = `gon-recipe-${Date.now()}.png`;
    link.href = href;
    link.click();
  };

  return (
    <div className="space-y-3">
      <div className="rounded border border-line bg-surface p-6 space-y-5">
        <div>
          <div className="text-xs font-medium text-faint">요청</div>
          <p className="text-base font-semibold mt-1">{query}</p>
        </div>
        <div>
          <div className="text-xs font-medium text-faint">참여 전문가</div>
          <p className="text-sm mt-1">{team.map((t) => t.character_name).join(' · ')}</p>
        </div>
        <div className="rounded bg-sunken p-4">
          <div className="text-xs font-semibold text-accent">다음엔 이렇게 질문해 보세요</div>
          <p className="text-sm leading-6 mt-1.5">{promptCoachTip}</p>
        </div>
        <div className="text-xs text-faint">Gon · 전국민 AI 평준화</div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={handleCopyCardText} className={btn}>
          {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? '복사됨' : '텍스트 복사'}</span>
        </button>
        <button type="button" onClick={handleDownloadImage} className={btn}>
          <Download className="w-4 h-4" />
          <span>이미지로 저장</span>
        </button>
      </div>
    </div>
  );
};
