import React from 'react';
import { Monitor, Sparkles, CheckCircle } from 'lucide-react';

export interface DeskData {
  id: string;
  name: string;
  role_korean: string;
  character_name: string;
  badge_label: string;
  avatar_color: string;
  desk_coord: { x: number; y: number };
  description: string;
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
  return (
    <div className="relative w-full aspect-[16/9] min-h-[380px] max-h-[500px] bg-[#0c0e17] rounded-3xl border border-slate-800/80 p-6 overflow-hidden shadow-2xl backdrop-blur-2xl">
      {/* 1. 오피스 바닥 그리드 및 파티션 가이드 (Munder Difflin Retro Vibe) */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #334155 1px, transparent 1px),
            linear-gradient(to bottom, #334155 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      {/* 2. 오피스 룸 구역 라벨 */}
      <div className="absolute top-4 left-6 text-[11px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>Munder Difflin HQ · Scranton AI Branch</span>
      </div>

      <div className="absolute top-4 right-6 text-[11px] font-mono text-slate-500">
        Active Agents: <span className="text-indigo-400 font-bold">{activeAgentIds.length}</span> / {desks.length}
      </div>

      {/* 3. 총괄 회의실 / 관리자 존 라인 (상단 중앙) */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 h-36 border border-dashed border-amber-500/20 rounded-2xl bg-amber-500/[0.02] flex items-start justify-center pt-2 pointer-events-none">
        <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500/40">
          Executive Office (Michael's Room)
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
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300 z-10`}
          >
            {/* 에이전트 머리 위 상태 말풍선 (Thinking / Working / Done) */}
            {isWorking && (
              <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-bounce">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>업무 처리 중...</span>
              </div>
            )}

            {!isWorking && isActive && (
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow flex items-center gap-1 whitespace-nowrap">
                <CheckCircle className="w-2.5 h-2.5" />
                <span>완료됨</span>
              </div>
            )}

            {/* 데스크 및 모니터 본체 */}
            <div className={`relative w-28 h-20 rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-300 border ${
              isSelected 
                ? 'bg-indigo-950/80 border-indigo-400 shadow-xl shadow-indigo-500/20 scale-105' 
                : isActive 
                ? 'bg-slate-900/90 border-slate-700 hover:border-slate-500 shadow-md' 
                : 'bg-slate-950/60 border-slate-900/80 opacity-60 hover:opacity-100'
            }`}>
              {/* 상단 모니터 & 이름 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Monitor className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <span className="text-[11px] font-bold text-slate-200 truncate max-w-[65px]">
                    {desk.character_name}
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  isWorking ? 'bg-amber-400 animate-ping' : isActive ? 'bg-emerald-400' : 'bg-slate-700'
                }`} />
              </div>

              {/* 하단 에이전트 아바타 & 직함 */}
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${desk.avatar_color} flex items-center justify-center text-white shadow-sm shrink-0 font-bold text-[10px]`}>
                  {desk.character_name[0]}
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-semibold text-slate-300 truncate">
                    {desk.badge_label}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">
                    {desk.role_korean.split(' ')[0]}
                  </div>
                </div>
              </div>
            </div>

            {/* 호버 툴팁 */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[10px] text-slate-400 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap z-20">
              클릭하여 {desk.character_name}의 터미널 보기
            </div>
          </div>
        );
      })}

      {/* 5. 바닥 장식 (워터쿨러, 화분, 커피머신 감성) */}
      <div className="absolute bottom-6 left-8 flex items-center gap-4 text-slate-600 text-xs pointer-events-none">
        <span className="flex items-center gap-1">☕ Break Room</span>
        <span className="flex items-center gap-1">🖨️ Central Printer</span>
      </div>
    </div>
  );
};
