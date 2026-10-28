import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Lightbulb, 
  Users, 
  FileText 
} from 'lucide-react';
import { OfficeFloor, DeskData } from './components/OfficeFloor';
import { AgentTerminalModal } from './components/AgentTerminalModal';

interface OfficeDispatchResponse {
  query: string;
  active_agent_ids: string[];
  agent_logs: Record<string, { name: string; role: string; status: string; log: string }>;
  final_content: string;
  prompt_coach_tip: string;
}

export function App() {
  const [desks, setDesks] = useState<DeskData[]>([]);
  const [query, setQuery] = useState('');
  const [activeAgentIds, setActiveAgentIds] = useState<string[]>([]);
  const [workingAgentIds, setWorkingAgentIds] = useState<string[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<OfficeDispatchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 샘플 지시어
  const sampleCommands = [
    "동네 감성 카페 창업을 위한 인스타 홍보 카피와 이벤트 기획서 써줘",
    "소상공인 지원사업 신청을 위한 표준 비즈니스 사업계획서 규격 작성",
    "실시간 채팅과 알림을 지원하는 가볍고 빠른 백엔드 시스템 설계 및 파이썬 코드",
    "다크 테마 기반의 세련되고 촌스럽지 않은 포트폴리오 웹 UI/UX 가이드"
  ];

  // 1. 오피스 레이아웃 불러오기
  useEffect(() => {
    fetch('/api/office/layout')
      .then((res) => res.json())
      .then((data) => {
        setDesks(data.desks || []);
      })
      .catch((err) => console.error('Failed to load office layout', err));
  }, []);

  // 2. 업무 디스패치 (총괄 지시 전달)
  const handleDispatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setDispatchResult(null);

    // 1단계: 마이클(Gon)이 팀원들에게 업무 배포 중 시각화
    setWorkingAgentIds(['gon-boss', 'k-planner', 'taste-designer', 'karpathy-dev', 'court-validator']);
    setActiveAgentIds(['gon-boss']);

    try {
      // 0.8초간 오피스 일하는 모션 연출
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

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>5 Desk Workers Active</span>
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
              <span>스크랜턴 가상 오피스에 업무 지시하기</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              상단 총괄 매니저 Michael(Gon)에게 1줄로 지시하면, 오피스 팀원들이 책상에서 각자의 전문 스킬로 작업합니다.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            💡 데스크를 클릭하면 해당 에이전트의 터미널을 열람할 수 있습니다.
          </span>
        </div>

        {/* 2D Munder Difflin 가상 오피스 캔버스 */}
        <OfficeFloor
          desks={desks}
          activeAgentIds={activeAgentIds}
          workingAgentIds={workingAgentIds}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => setSelectedAgentId(id)}
        />

        {/* 사령탑 업무 지시 커맨드 바 (Command Bar) */}
        <div className="space-y-3">
          <form onSubmit={handleDispatch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="총괄 매니저 Michael에게 어떤 업무를 맡기시겠습니까? (예: 카페 인스타 홍보 카피와 사업계획서)"
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
          <div className="space-y-6 pt-4 animate-in fade-in-50 duration-500">
            {/* 상단 액션 바 */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">오피스 팀원 합동 산출물</span>
                <span className="text-[11px] text-slate-400">
                  (참여: {dispatchResult.active_agent_ids.length}명 에이전트)
                </span>
              </div>
              <button
                onClick={() => {
                  setDispatchResult(null);
                  setActiveAgentIds([]);
                  setQuery('');
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                새 업무 지시
              </button>
            </div>

            {/* 통합 보고서 본문 */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 shadow-2xl leading-relaxed whitespace-pre-wrap font-sans text-sm sm:text-base border-l-4 border-l-amber-500">
              {dispatchResult.final_content}
            </div>

            {/* 💡 [Michael's Tip] AI 평준화 리터러시 코치 */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/20 flex items-start gap-3.5 shadow-xl">
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
          </div>
        )}
      </main>

      {/* 4. 에이전트 개별 터미널 모달 */}
      <AgentTerminalModal
        agent={selectedAgent}
        log={selectedAgentLog || undefined}
        onClose={() => setSelectedAgentId(null)}
      />

      {/* 5. 푸터 */}
      <footer className="border-t border-slate-900/80 py-5 text-center text-xs text-slate-600">
        Munder Difflin AI Office · 전국민 AI 평준화 플랫폼 (SIDE_PJ) · Reverse Engineered with REA Skill
      </footer>
    </div>
  );
}

export default App;
