import React from 'react';
import { X, Terminal as TerminalIcon } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#090b14] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* 터미널 상단 윈도우 바 */}
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            </div>
            <TerminalIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-slate-200">
              {agent.character_name.toUpperCase()} · {agent.name} TERMINAL
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 에이전트 프로필 요약 바 */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">직무:</span>{' '}
            <span className="text-slate-200 font-medium">{agent.role_korean}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]">
            {agent.badge_label}
          </span>
        </div>

        {/* 터미널 출력 영역 */}
        <div className="p-5 font-mono text-xs text-slate-300 leading-relaxed bg-[#06070c] min-h-[220px] max-h-[350px] overflow-y-auto space-y-3">
          <div className="text-slate-500 text-[11px]">
            [SYSTEM] Connected to agent worker #{agent.id} (status: active)
          </div>
          <div className="text-indigo-400">
            $ agent-run --role "{agent.character_name}" --skill "{agent.badge_label}"
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-200 whitespace-pre-wrap">
            {log || '현재 대기 중인 태스크가 없습니다. 상단 커맨드 바에서 새로운 목표를 지시해주세요.'}
          </div>
          <div className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Agent process running smoothly with 0 errors</span>
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="px-5 py-3 bg-slate-900/40 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
