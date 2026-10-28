import React, { useRef, useState } from 'react';
import { Sparkles, Copy, Check, Download, ChefHat } from 'lucide-react';
import { DeskData } from './OfficeFloor';

interface PromptRecipeCardProps {
  query: string;
  team: DeskData[];
  promptCoachTip: string;
}

export const PromptRecipeCard: React.FC<PromptRecipeCardProps> = ({
  query,
  team,
  promptCoachTip,
}) => {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCopyCardText = () => {
    const textToCopy = `📋 [Munder Difflin AI 프롬프트 레시피]\n\n🎯 원래 질문: "${query}"\n👨‍💼 출근 에이전트: ${team.map(t => `${t.character_name}(${t.name})`).join(', ')}\n\n💡 AI 평준화 팁:\n${promptCoachTip}\n\n👉 전국민 AI 평준화 플랫폼 (SkillBridge)`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!cardRef.current) return;
    
    // Canvas를 활용하여 공유 카드 이미지 생성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 380;

    // 배경 그라데이션
    const bgGradient = ctx.createLinearGradient(0, 0, 600, 380);
    bgGradient.addColorStop(0, '#0f121e');
    bgGradient.addColorStop(1, '#08090f');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 600, 380);

    // 테두리
    ctx.strokeStyle = '#272b3c';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 596, 376);

    // 상단 오피스 엠블럼 바
    ctx.fillStyle = '#6E1423';
    ctx.fillRect(20, 20, 40, 40);
    ctx.fillStyle = '#F4F1EA';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('MD', 28, 46);

    // 헤더 텍스트
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('MUNDER DIFFLIN AI PROMPT RECIPE', 75, 38);
    ctx.fillStyle = '#f59e0b';
    ctx.font = '11px sans-serif';
    ctx.fillText('전국민 AI 평준화 공식 레시피 카드', 75, 54);

    // 의뢰 과제
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('ORIGINAL REQUEST', 24, 90);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px sans-serif';
    const truncatedQuery = query.length > 40 ? query.slice(0, 38) + '...' : query;
    ctx.fillText(`"${truncatedQuery}"`, 24, 112);

    // 참여 에이전트
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('DISPATCHED AGENT SQUAD', 24, 150);

    const teamNames = team.map(t => `${t.character_name}`).join(' · ');
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(teamNames, 24, 170);

    // 레시피 박스 배경
    ctx.fillStyle = '#161928';
    ctx.fillRect(20, 195, 560, 130);
    ctx.strokeStyle = '#3730a3';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 195, 560, 130);

    // 레시피 본문
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText("💡 Michael's Master Prompt Tip", 36, 222);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    
    // 줄바꿈 텍스트 렌더링
    const words = promptCoachTip.split(' ');
    let line = '';
    let y = 246;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 520 && n > 0) {
        ctx.fillText(line, 36, y);
        line = words[n] + ' ';
        y += 20;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 36, y);

    // 워터마크 푸터
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.fillText('SkillBridge AI Platform · https://github.com/2Jaegon/SIDE_PJ', 24, 355);

    // 이미지 다운로드 트리거
    const link = document.createElement('a');
    link.download = `munder-recipe-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-3">
      {/* 1. 실제 공유 카드 그래픽 컴포넌트 */}
      <div 
        ref={cardRef}
        className="relative w-full rounded-2xl bg-gradient-to-br from-[#101322] via-[#090b14] to-[#0d0f1a] border-2 border-indigo-500/30 p-6 shadow-2xl overflow-hidden font-sans"
      >
        {/* 상단 오피스 레트로 뱃지 */}
        <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6E1423] border-2 border-[#4A0D17] flex items-center justify-center font-mono font-black text-amber-100 shadow-md">
              MD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-extrabold tracking-wider text-slate-100">
                  MUNDER DIFFLIN AI RECIPE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  전국민 AI 평준화
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                상위 1% 프롬프트 전문가 비결이 담긴 공유용 레시피
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
            <ChefHat className="w-4 h-4" />
            <span>Official Recipe</span>
          </div>
        </div>

        {/* 의뢰 과제 & 에이전트 태그 */}
        <div className="space-y-3 mb-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              TARGET QUERY
            </span>
            <p className="text-sm font-bold text-slate-200 mt-0.5">
              "{query}"
            </p>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              COLLABORATIVE AGENT SQUAD
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {team.map((agent) => (
                <span 
                  key={agent.id}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-900 border border-indigo-500/20 text-indigo-300 font-medium"
                >
                  {agent.character_name} ({agent.badge_label})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 핵심 프롬프트 레시피 카드 박스 */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Michael's AI 레시피 코칭 (Secret Sauce)</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {promptCoachTip}
          </p>
        </div>

        {/* 하단 워터마크 */}
        <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>SkillBridge Platform</span>
          <span>github.com/2Jaegon/SIDE_PJ</span>
        </div>
      </div>

      {/* 2. 카드 액션 버튼들 (복사 / 이미지 다운로드) */}
      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          onClick={handleCopyCardText}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '복사됨!' : '레시피 텍스트 복사'}</span>
        </button>
        <button
          onClick={handleDownloadImage}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
        >
          <Download className="w-3.5 h-3.5" />
          <span>레시피 카드 PNG 저장</span>
        </button>
      </div>
    </div>
  );
};
