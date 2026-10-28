import React from 'react';
import { Monitor, Sparkles, CheckCircle, Wrench } from 'lucide-react';

export interface DeskData {
  id: string;
  name: string;
  role_korean: string;
  character_name: string;
  badge_label: string;
  accent: string;
  desk_coord: { x: number; y: number };
  description: string;
  skills?: string[];
  mcp_servers?: string[];
}

interface OfficeFloorProps {
  desks: DeskData[];
  activeAgentIds: string[];
  workingAgentIds: string[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
}

export const OfficeFloor: React.FC<OfficeFloorProps> = ({
  desks,
  activeAgentIds,
  workingAgentIds,
  selectedAgentId,
  onSelectAgent,
}) => {
  const getAccentGradient = (accent: string) => {
    switch (accent) {
      case 'peach': return 'from-orange-400 to-amber-500';
      case 'mint': return 'from-emerald-400 to-teal-500';
      case 'lavender': return 'from-purple-400 to-indigo-500';
      case 'rose': return 'from-rose-400 to-pink-500';
      case 'amber': return 'from-amber-400 to-yellow-500';
      default: return 'from-indigo-400 to-blue-500';
    }
  };

  return (
    <div className="relative w-full aspect-[16/9] min-h-[420px] max-h-[520px] bg-[#0b0d14] rounded-3xl border border-slate-800/90 p-6 overflow-hidden shadow-2xl backdrop-blur-2xl">
      {/* 1. Munder Difflin 공식 2D 오피스 그리드 바닥 */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #475569 1px, transparent 1px),
            linear-gradient(to bottom, #475569 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px'
        }}
      />

      {/* 2. 상단 지휘관 룸 (Michael's Corner Office) */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-80 h-32 border-2 border-dashed border-amber-500/25 rounded-2xl bg-amber-500/[0.03] flex flex-col items-center justify-start pt-2 pointer-events-none">
        <span className="text-[11px] font-mono tracking-widest text-amber-400/80 uppercase font-bold flex items-center gap-1.5">
          <span>👑 Michael's Regional Manager Office</span>
        </span>
        <span className="text-[10px] text-slate-500 mt-1 font-mono">
          "World's Best Boss" · Strategy & Coordination
        </span>
      </div>

      {/* 3. 오피스 상태 헤더 */}
      <div className="absolute top-4 left-6 text-xs font-mono tracking-wider text-slate-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-bold text-slate-200">MUNDER DIFFLIN HQ</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-500">Scranton Branch Floor 3</span>
      </div>

      <div className="absolute top-4 right-6 text-xs font-mono text-slate-400 flex items-center gap-3">
        <span>36 Official Agent Templates Loaded</span>
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px]">
          Live Harness v2.0
        </span>
      </div>

      {/* 4. 에이전트 데스크들 배치 */}
      {desks.map((desk) => {
        const isActive = activeAgentIds.includes(desk.id);
        const isWorking = workingAgentIds.includes(desk.id);
        const isSelected = selectedAgentId === desk.id;

        return (
          <div
            key={desk.id}
            onClick={() => onSelectAgent(desk.id)}
            style={{
              left: `${desk.desk_coord.x}%`,
              top: `${desk.desk_coord.y}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300 z-10"
          >
            {/* 상태 뱃지 말풍선 */}
            {isWorking && (
              <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xl flex items-center gap-1.5 whitespace-nowrap animate-bounce border border-white/20">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>터미널 작업 중...</span>
              </div>
            )}

            {!isWorking && isActive && (
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap border border-emerald-400/30">
                <CheckCircle className="w-2.5 h-2.5" />
                <span>업무 완료</span>
              </div>
            )}

            {/* 책상 및 모니터 바디 */}
            <div className={`relative w-32 h-24 rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-300 border ${
              isSelected 
                ? 'bg-indigo-950/90 border-indigo-400 shadow-2xl shadow-indigo-500/30 scale-105' 
                : isActive 
                ? 'bg-slate-900/95 border-slate-700 hover:border-slate-500 shadow-lg' 
                : 'bg-slate-950/70 border-slate-900 opacity-60 hover:opacity-100'
            }`}>
              {/* 상단 모니터 & 캐릭터 이름 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Monitor className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <span className="text-xs font-bold text-slate-100 truncate max-w-[70px]">
                    {desk.character_name}
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  isWorking ? 'bg-amber-400 animate-ping' : isActive ? 'bg-emerald-400' : 'bg-slate-700'
                }`} />
              </div>

              {/* 하단 캐릭터 아바타 및 역할 */}
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${getAccentGradient(desk.accent)} flex items-center justify-center text-white shadow-md shrink-0 font-black text-xs border border-white/20`}>
                  {desk.character_name[0]}
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-bold text-slate-200 truncate">
                    {desk.name}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate flex items-center gap-1">
                    <Wrench className="w-2.5 h-2.5 text-indigo-400" />
                    <span>{desk.badge_label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 호버 힌트 */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[10px] text-slate-300 bg-slate-900/95 px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg z-20">
              클릭하여 {desk.character_name}의 공식 템플릿 & 터미널 열람
            </div>
          </div>
        );
      })}

      {/* 5. 휴게실 및 편의시설 디테일 */}
      <div className="absolute bottom-5 left-8 flex items-center gap-5 text-slate-500 text-xs font-mono pointer-events-none">
        <span className="flex items-center gap-1.5">☕ Scranton Coffee Machine</span>
        <span className="flex items-center gap-1.5">📑 Dunder Mifflin Paper Stacks</span>
      </div>
    </div>
  );
};
