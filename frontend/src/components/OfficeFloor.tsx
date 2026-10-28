import React, { useState } from 'react';
import { 
  Coffee, 
  Sparkles, 
  Check, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Users, 
  Monitor, 
  Pin
} from 'lucide-react';
import { AgentFigure } from './AgentFigure';
import { playCoffeeBrew, toggleMute, getMuted } from '../utils/sound';

export interface DeskData {
  id: string;
  name: string;
  role_korean: string;
  character_name: string;
  badge_label: string;
  accent: string;
  desk_coord: { x: number; y: number };
  desk_index?: number;
  description: string;
  skills?: string[];
  mcp_servers?: string[];
}

interface OfficeFloorProps {
  desks: DeskData[];
  activeAgentIds: string[];
  workingAgentIds: string[];
  failedAgentIds?: string[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onOpenRosterSlot?: (slotIndex: number) => void;
  onOpenRosterPool?: () => void;
  currentQuery?: string;
}

export const OfficeFloor: React.FC<OfficeFloorProps> = ({
  desks,
  activeAgentIds,
  workingAgentIds,
  failedAgentIds = [],
  selectedAgentId,
  onSelectAgent,
  onOpenRosterSlot,
  onOpenRosterPool,
  currentQuery = '',
}) => {
  const [coffeeToast, setCoffeeToast] = useState(false);
  const [isMuted, setIsMuted] = useState(getMuted());
  const [plantWiggle, setPlantWiggle] = useState(false);

  const handleCoffeeClick = () => {
    playCoffeeBrew();
    setCoffeeToast(true);
    setTimeout(() => setCoffeeToast(false), 3000);
  };

  const handlePlantClick = () => {
    setPlantWiggle(true);
    setTimeout(() => setPlantWiggle(false), 800);
  };

  const handleSoundToggle = () => {
    const muted = toggleMute();
    setIsMuted(muted);
  };

  const leadDesk = desks.find((d) => d.id === 'lead');
  const workerDesks = desks.filter((d) => d.id !== 'lead');

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-[#f8f9fa] to-[#eceeed] border border-[#d6d9d8] p-5 sm:p-7 shadow-inner overflow-hidden select-none">
      {/* 1. 상단 오피스 상태 바 및 환경 컨트롤러 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[#dde0df]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            Gon AI Virtual Studio Floor
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
            {desks.length > 0 ? `${desks.length}명 근무 중` : '스튜디오 대기 중'}
          </span>
        </div>

        {/* 인터랙티브 오피스 툴바 */}
        <div className="flex items-center gap-2">
          {/* 사운드 토글 버튼 */}
          <button
            type="button"
            onClick={handleSoundToggle}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 shadow-sm transition-all"
            title={isMuted ? '효과음 켜기' : '효과음 끄기'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span className="text-[11px] hidden sm:inline">{isMuted ? '음소거' : '효과음 ON'}</span>
          </button>

          {/* 46명 전체 인재풀 열기 버튼 */}
          {onOpenRosterPool && (
            <button
              type="button"
              onClick={onOpenRosterPool}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
            >
              <Users className="w-3.5 h-3.5" />
              <span>전문가 인재풀 (46명)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 오피스 플로어 캔버스 */}
      <div className="space-y-6">
        {/* 상단 섹션: 회의용 화이트보드 + Gon 지휘 데스크 + 휴게 카페테리아 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* [좌측 4열]: 전략 회의 화이트보드 (인터랙티브 메모 핀) */}
          <div className="lg:col-span-4 rounded-xl bg-white/90 border border-slate-300 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>실시간 프로젝트 보드</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">LIVE SYNC</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {currentQuery ? (
                  <span className="font-medium text-slate-800">
                    "{currentQuery}"
                  </span>
                ) : (
                  <span className="text-slate-400 italic">
                    새로운 프로젝트 요구사항이 입력되면 여기에 실시간 과제 목표가 핀됩니다.
                  </span>
                )}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>총괄: Gon (Master)</span>
              <span>스킬 체인 오케스트레이션</span>
            </div>
          </div>

          {/* [중앙 5열]: Gon 총괄 지휘 센터 (Command Station) */}
          {leadDesk && (
            <div className="lg:col-span-5">
              <div
                onClick={() => onSelectAgent(leadDesk.id)}
                className={`h-full rounded-xl p-4 border transition-all cursor-pointer bg-white/95 shadow-sm relative group ${
                  selectedAgentId === leadDesk.id
                    ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>HQ LEAD</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <AgentFigure
                      accent={leadDesk.accent}
                      state={workingAgentIds.includes(leadDesk.id) ? 'working' : 'done'}
                      className="w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">COMMAND DESK</div>
                    <div className="text-sm font-extrabold text-slate-900 truncate">{leadDesk.character_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{leadDesk.name}</div>
                    
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      {workingAgentIds.includes(leadDesk.id) ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          팀 조율 & 종합 중...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          지휘 준비 완료
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* [우측 3열]: 카페테리아 & 몬스테라 플랜트 코너 */}
          <div className="lg:col-span-3 rounded-xl bg-white/80 border border-slate-300 p-3.5 shadow-sm flex items-center justify-around relative">
            {/* 커피 머신 버튼 */}
            <button
              type="button"
              onClick={handleCoffeeClick}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-transform active:scale-95 group"
              title="커피 한 잔 추출하기"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 group-hover:bg-amber-500/20 shadow-sm">
                <Coffee className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">에스프레소 바</span>
            </button>

            {/* 커피 토스트 말풍선 */}
            {coffeeToast && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg whitespace-nowrap animate-bounce">
                ☕ 원두 추출 완료! 팀 집중력 +20%
              </div>
            )}

            {/* 몬스테라 화분 */}
            <button
              type="button"
              onClick={handlePlantClick}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-all ${
                plantWiggle ? 'animate-wiggle' : ''
              }`}
              title="화분 잎사귀 흔들기"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
                🪴
              </div>
              <span className="text-[11px] font-semibold text-slate-700">오피스 플랜트</span>
            </button>
          </div>
        </div>

        {/* 하단 섹션: 출근한 전문 에이전트 워크스테이션 그리드 */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-slate-600 tracking-wider uppercase flex items-center gap-1.5">
              <span>TEAM WORKSTATIONS</span>
              <span className="text-slate-400 font-normal">({workerDesks.length}석 가동)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              💡 책상을 클릭해 실시간 모니터를 확인하거나 전문가를 교체할 수 있습니다.
            </span>
          </div>

          {workerDesks.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-200/80 mx-auto flex items-center justify-center text-slate-500">
                <Users className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <p className="text-sm font-semibold text-slate-700">현재 비어 있는 데스크입니다</p>
                <p className="text-xs text-slate-400 mt-1">
                  질문을 보내면 Gon이 필요한 전문가를 불러 자리를 채우거나, 상단의 [전문가 인재풀]에서 직접 팀을 배치할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {workerDesks.map((desk, idx) => {
                const isWorking = workingAgentIds.includes(desk.id);
                const isFailed = failedAgentIds.includes(desk.id);
                const isDone = !isWorking && !isFailed && activeAgentIds.includes(desk.id);
                const isSelected = selectedAgentId === desk.id;
                const state = isWorking ? 'working' : isDone ? 'done' : 'idle';

                return (
                  <div
                    key={desk.id}
                    className={`relative rounded-xl border bg-white shadow-sm p-4 flex flex-col justify-between transition-all duration-200 group ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                        : isWorking
                        ? 'border-emerald-500 shadow-md shadow-emerald-500/5'
                        : 'border-slate-300 hover:border-slate-400 hover:shadow-md'
                    }`}
                  >
                    {/* 상단 슬롯 번호 및 교체 버튼 */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          DESK 0{idx + 1}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[90px]">
                          {desk.badge_label}
                        </span>
                      </div>

                      {/* 개별 데스크 교체 액션 */}
                      {onOpenRosterSlot && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRosterSlot(idx);
                          }}
                          className="text-[11px] text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                          title="이 자리의 전문가 교체"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>교체</span>
                        </button>
                      )}
                    </div>

                    {/* 책상 일러스트 및 에이전트 피규어 */}
                    <div
                      onClick={() => onSelectAgent(desk.id)}
                      className="cursor-pointer py-1 flex justify-center relative"
                    >
                      <AgentFigure accent={desk.accent} state={state} className="w-28 sm:w-32" />

                      {/* 실시간 말풍선 (작업 중일 때) */}
                      {isWorking && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-800 text-white text-[10px] font-semibold px-2.5 py-0.8 rounded-full shadow-md whitespace-nowrap animate-bounce flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>실행안 작성 중...</span>
                        </div>
                      )}
                    </div>

                    {/* 에이전트 프로필 및 상태 */}
                    <div
                      onClick={() => onSelectAgent(desk.id)}
                      className="cursor-pointer mt-3 pt-2 border-t border-slate-100 min-w-0"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold text-slate-800 truncate">{desk.character_name}</span>
                        {isWorking ? (
                          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            작업 중
                          </span>
                        ) : isDone ? (
                          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3 text-emerald-600" />
                            완료
                          </span>
                        ) : isFailed ? (
                          <span className="text-[10px] font-semibold text-rose-500 shrink-0">오류</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 shrink-0">대기 중</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed h-8">
                        {desk.name}
                      </p>

                      {/* 호버 시 모니터 엿보기 가이드 힌트 */}
                      <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity bg-slate-50 py-1 rounded">
                        <Monitor className="w-3 h-3" />
                        <span>모니터 및 산출물 열람</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
