import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Lightbulb, 
  Users, 
  UserPlus
} from 'lucide-react';
import { OfficeFloor, DeskData } from './components/OfficeFloor';
import { AgentTerminalModal } from './components/AgentTerminalModal';
import { RosterDrawer, AgentTemplate } from './components/RosterDrawer';
import { ExportActionBar } from './components/ExportActionBar';
import { PromptRecipeCard } from './components/PromptRecipeCard';

interface OfficeDispatchResponse {
  query: string;
  active_agent_ids: string[];
  team: DeskData[];
  agent_logs: Record<string, { name: string; character: string; role: string; status: string; log: string }>;
  final_content: string;
  prompt_coach_tip: string;
}

export function App() {
  const [desks, setDesks] = useState<DeskData[]>([]);
  const [allTemplates, setAllTemplates] = useState<AgentTemplate[]>([]);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);

  const [query, setQuery] = useState('');
  const [activeAgentIds, setActiveAgentIds] = useState<string[]>([]);
  const [workingAgentIds, setWorkingAgentIds] = useState<string[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<OfficeDispatchResponse | null>(null);
  const [showRecipeCard, setShowRecipeCard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 추천 샘플 지시어
  const sampleCommands = [
    "동네 감성 카페 창업을 위한 인스타 홍보 카피와 오픈 이벤트 기획서 써줘",
    "소상공인 지원사업 신청을 위한 표준 비즈니스 사업계획서 규격 작성",
    "실시간 채팅과 알림을 지원하는 가볍고 빠른 백엔드 시스템 설계 및 파이썬 코드",
    "다크 테마 기반의 세련되고 촌스럽지 않은 포트폴리오 웹 UI/UX 가이드"
  ];

  // 1. 오피스 현재 데스크 레이아웃 및 36개 전체 템플릿 로드
  useEffect(() => {
    // 현재 출근 팀 로드
    fetch('/api/office/layout')
      .then((res) => res.json())
      .then((data) => {
        setDesks(data.desks || []);
      })
      .catch((err) => console.error('Failed to load office layout', err));

    // 36개 전체 인재풀 로드
    fetch('/api/office/all-templates')
      .then((res) => res.json())
      .then((data) => {
        setAllTemplates(data.templates || []);
      })
      .catch((err) => console.error('Failed to load agent templates', err));
  }, []);

  // 2. 특정 데스크 슬롯의 에이전트 교체
  const handleSelectAgentForSlot = async (newAgentId: string, slotIndex: number) => {
    const newTeamIds = desks.map((d) => d.id);
    if (slotIndex >= 0 && slotIndex < newTeamIds.length) {
      newTeamIds[slotIndex] = newAgentId;
    } else {
      newTeamIds.push(newAgentId);
    }

    try {
      const res = await fetch('/api/office/set-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_ids: newTeamIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setDesks(data.team || []);
        setIsRosterOpen(false);
      }
    } catch (err) {
      alert('에이전트 교체 중 오류가 발생했습니다.');
    }
  };

  // 3. 업무 디스패치 (총괄 지시 전달)
  const handleDispatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setDispatchResult(null);

    // 전체 데스크 작업 모션 켜기
    const currentIds = desks.map((d) => d.id);
    setWorkingAgentIds(currentIds);
    setActiveAgentIds(currentIds);

    try {
      await new Promise((r) => setTimeout(r, 900));

      const res = await fetch('/api/office/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error('업무 배포 실패');

      const data: OfficeDispatchResponse = await res.json();
      setDispatchResult(data);
      setActiveAgentIds(data.active_agent_ids || []);
      setWorkingAgentIds([]);
    } catch (err) {
      alert('에이전트 오피스 통신 오류가 발생했습니다.');
      setWorkingAgentIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAgent = desks.find((d) => d.id === selectedAgentId) || null;
  const selectedAgentLog = selectedAgentId && dispatchResult?.agent_logs?.[selectedAgentId]?.log;

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 font-sans">
      {/* 1. Munder Difflin 스타일 오피스 헤더 HUD */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-orange-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  Munder Difflin
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  AI Office Edition
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                전국민 AI 평준화 가상 사무실 · Powered by Gon (Michael) & Team
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {/* 36개 인재풀 열기 버튼 */}
            <button
              onClick={() => {
                setTargetSlotIndex(0);
                setIsRosterOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition-all hover:scale-105"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>에이전트 교체 ({allTemplates.length}명 인재풀)</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{desks.length}명 출근 중</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 메인 가상 오피스 스테이지 */}
      <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1 space-y-8">
        {/* 설명 및 미션 안내 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>스크랜턴 가상 오피스 데스크</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              각 책상의 에이전트를 클릭해 터미널을 열람하거나, <b>[에이전트 교체]</b>로 36개 전문 템플릿(법률, 개발, 마케팅, 디자인 등)을 출근시키세요.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            💡 데스크에 마우스를 올리면 빠른 교체(아이콘)가 가능합니다.
          </span>
        </div>

        {/* 2D Munder Difflin 가상 오피스 캔버스 */}
        <OfficeFloor
          desks={desks}
          activeAgentIds={activeAgentIds}
          workingAgentIds={workingAgentIds}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => setSelectedAgentId(id)}
          onOpenRosterSlot={(slotIdx) => {
            setTargetSlotIndex(slotIdx);
            setIsRosterOpen(true);
          }}
        />

        {/* 사령탑 업무 지시 커맨드 바 (Command Bar) */}
        <div className="space-y-3">
          <form onSubmit={handleDispatch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="현재 출근한 팀원들에게 어떤 업무를 맡기시겠습니까? (예: 모바일 쇼핑몰 화면 기획 및 백엔드 설계)"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl px-5 py-4 pr-14 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 shadow-xl transition-all"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2.5 top-2.5 bottom-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600 text-white flex items-center justify-center hover:opacity-95 transition-opacity disabled:opacity-50 font-medium text-xs gap-1.5 shadow-lg shadow-indigo-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>배포</span>
            </button>
          </form>

          {/* 샘플 업무 바로 지시 칩 */}
          {!dispatchResult && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">추천 업무:</span>
              {sampleCommands.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(cmd)}
                  className="text-left text-[11px] text-slate-400 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all line-clamp-1"
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. 오피스 통합 산출물 & 리터러시 코치 카드 */}
        {dispatchResult && (
          <div className="space-y-5 pt-4 animate-in fade-in-50 duration-500">
            {/* 산출물 내보내기 & 공유 액션 바 */}
            <ExportActionBar
              query={dispatchResult.query}
              content={dispatchResult.final_content}
              team={desks.filter((d) => dispatchResult.active_agent_ids.includes(d.id))}
              promptCoachTip={dispatchResult.prompt_coach_tip}
              showRecipeCard={showRecipeCard}
              onToggleRecipeCard={() => setShowRecipeCard(!showRecipeCard)}
            />

            {/* 토글 시 노출되는 공유용 프롬프트 레시피 카드 */}
            {showRecipeCard && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <PromptRecipeCard
                  query={dispatchResult.query}
                  team={desks.filter((d) => dispatchResult.active_agent_ids.includes(d.id))}
                  promptCoachTip={dispatchResult.prompt_coach_tip}
                />
              </div>
            )}

            {/* 통합 보고서 본문 카드 */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 shadow-2xl leading-relaxed whitespace-pre-wrap font-sans text-sm sm:text-base border-l-4 border-l-amber-500">
              {dispatchResult.final_content}
            </div>

            {/* 💡 [Michael's Tip] AI 평준화 리터러시 코치 카드 */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/20 flex items-start justify-between gap-3.5 shadow-xl">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Michael's AI 평준화 코칭 (Prompt Literacy)
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300">
                    {dispatchResult.prompt_coach_tip}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setDispatchResult(null);
                  setActiveAgentIds([]);
                  setQuery('');
                  setShowRecipeCard(false);
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors shrink-0 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>새 업무 지시</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 4. 에이전트 개별 터미널 모달 */}
      <AgentTerminalModal
        agent={selectedAgent}
        log={selectedAgentLog || undefined}
        onClose={() => setSelectedAgentId(null)}
      />

      {/* 5. 36개 에이전트 인재풀 슬라이드 드로어 */}
      <RosterDrawer
        isOpen={isRosterOpen}
        templates={allTemplates}
        currentTeamIds={desks.map((d) => d.id)}
        targetSlotIndex={targetSlotIndex}
        onClose={() => setIsRosterOpen(false)}
        onSelectAgentForSlot={handleSelectAgentForSlot}
      />

      {/* 6. 푸터 */}
      <footer className="border-t border-slate-900/80 py-5 text-center text-xs text-slate-600">
        Munder Difflin AI Office · 전국민 AI 평준화 플랫폼 (SIDE_PJ) · 36 Official Agent Templates
      </footer>
    </div>
  );
}

export default App;
