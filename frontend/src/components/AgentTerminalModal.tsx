import React from 'react';
import { X, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { DeskData } from './OfficeFloor';

interface AgentTerminalModalProps {
  agent: DeskData | null;
  log?: string;
  onClose: () => void;
}

export const AgentTerminalModal: React.FC<AgentTerminalModalProps> = ({
  agent,
  log,
  onClose,
}) => {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#080910] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* 상단 터미널 헤더 바 */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            </div>
            <TerminalIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
              {agent.character_name} ({agent.name}) · Official Agent Terminal
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 템플릿 메타데이터 바 */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">SPEC / CHARACTER</span>
            <span className="text-slate-200 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              munder-difflin/agent@2 ({agent.character_name})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">ACCENT THEME</span>
            <span className="text-slate-300 font-medium capitalize mt-0.5">{agent.accent}</span>
          </div>
        </div>

        {/* 터미널 출력 본문 */}
        <div className="p-5 font-mono text-xs text-slate-300 leading-relaxed bg-[#05060a] min-h-[250px] max-h-[380px] overflow-y-auto space-y-3">
          <div className="text-slate-500 text-[11px]">
            [MUNDER-DIFFLIN HARNESS v2.0] Active Worker Daemon: {agent.id}
          </div>
          <div className="text-indigo-400">
            $ munder-agent --character "{agent.character_name.toLowerCase()}" --role "{agent.name}"
          </div>
          
          {/* 공식 역할 & 목표 카드 */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-200 space-y-2">
            <div className="text-amber-300/90 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>에이전트 공식 사명 (Official Mission)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              {agent.description || '전문 작업 완수 및 실시간 산출물 생성.'}
            </p>
          </div>

          {/* 실시간 작업 로그 */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/20 text-slate-200 whitespace-pre-wrap leading-relaxed">
            {log || '현재 대기 중입니다. 상단 총괄 지휘 바에서 새로운 업무를 배포해주세요.'}
          </div>

          <div className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Task executed successfully · 0 security violations</span>
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="px-5 py-3 bg-slate-900/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition-colors"
          >
            터미널 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
