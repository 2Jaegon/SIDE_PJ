import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, RotateCcw, AlertCircle, Users, Sparkles, X } from 'lucide-react';
import { OfficeFloor, DeskData } from './components/OfficeFloor';
import { AgentTerminalModal } from './components/AgentTerminalModal';
import { ExportActionBar } from './components/ExportActionBar';
import { PromptRecipeCard } from './components/PromptRecipeCard';
import { ActivityFeed, FeedItem } from './components/ActivityFeed';
import { RosterDrawer, ExpertItem } from './components/RosterDrawer';
import { Avatar } from './components/Avatar';
import { playKeyClick, playDoneChime } from './utils/sound';

interface Expert {
  id: string;
  name: string;
  kind: string;
  cluster: string;
  cluster_ko?: string;
  accent: string;
  use_for: string;
  task: string;
}

interface Result {
  mode: 'ai' | 'stub';
  query: string;
  plan_reason: string;
  experts: Expert[];
  agent_logs: Record<string, { name: string; status: string; log: string }>;
  final_content: string;
  prompt_coach_tip: string;
}

type StreamEvent =
  | { type: 'start'; mode: 'ai' | 'stub'; lead: Expert }
  | { type: 'plan'; reason: string; experts: Expert[] }
  | { type: 'agent'; id: string; status: 'done' | 'error'; text: string }
  | { type: 'synthesis' }
  | { type: 'final'; data: Result }
  | { type: 'error'; message: string };

interface PoolSummary {
  total: number;
  clusters: Record<string, number>;
  mode: 'ai' | 'stub';
  max_experts: number;
}

const SAMPLES = [
  '동네 감성 카페 오픈 이벤트 인스타 홍보글 써줘',
  '소상공인 지원사업 신청용 비즈니스 사업계획서 초안',
  '실시간 채팅과 알림을 지원하는 가볍고 빠른 백엔드 시스템 설계',
  '다크 테마 기반의 세련된 포트폴리오 웹사이트 UI/UX 가이드',
];

const toDesk = (e: Expert, i: number): DeskData => ({
  id: e.id,
  name: e.task || e.use_for,
  role_korean: e.name,
  character_name: e.name,
  badge_label: e.cluster_ko || '',
  accent: e.accent,
  desk_coord: { x: 0, y: i },
  description: e.use_for,
});

const brief = (text: string) => {
  const first = (text.split('\n').find((l) => l.trim()) || '').replace(/^[•\-\s]+/, '');
  return first.length > 90 ? `${first.slice(0, 89)}…` : first;
};

const Mark: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
    <rect width="28" height="28" rx="7" fill="#0b6b5c" />
    <path d="M6 18.5h16M9 18.5V12m10 6.5V12M6 12c3.5-5 12.5-5 16 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export function App() {
  const [pool, setPool] = useState<PoolSummary | null>(null);
  const [desks, setDesks] = useState<DeskData[]>([]);
  const [query, setQuery] = useState('');
  const [activeAgentIds, setActiveAgentIds] = useState<string[]>([]);
  const [workingAgentIds, setWorkingAgentIds] = useState<string[]>([]);
  const [failedAgentIds, setFailedAgentIds] = useState<string[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showRecipeCard, setShowRecipeCard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  
  // 가상 오피스 인재풀 & 커스텀 팀 상태
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [customTeam, setCustomTeam] = useState<ExpertItem[]>([]);

  const runId = useRef(0);

  useEffect(() => {
    fetch('/api/office/pool')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPool)
      .catch(() => setError('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'));
  }, []);

  const say = (d: DeskData, text: string, key: string) =>
    setFeed((f) => [...f, { id: `${d.id}-${key}-${f.length}`, character: d.character_name, accent: d.accent, text }]);

  // 전문가 인재풀에서 특정 슬롯에 에이전트 지정 또는 팀에 추가
  const handleSelectExpert = (expert: ExpertItem, slotIdx: number | null) => {
    setCustomTeam((prev) => {
      const exists = prev.some((x) => x.id === expert.id);
      if (exists) {
        return prev.filter((x) => x.id !== expert.id);
      }
      if (slotIdx !== null && slotIdx < prev.length) {
        const next = [...prev];
        next[slotIdx] = expert;
        return next;
      }
      return [...prev, expert].slice(0, 5);
    });
    setIsRosterOpen(false);
    setTargetSlotIndex(null);
  };

  const handleDispatch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;

    const myRun = ++runId.current;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowRecipeCard(false);
    setFailedAgentIds([]);
    setTexts({});
    setFeed([]);
    setActiveAgentIds([]);
    setWorkingAgentIds([]);

    let roster: DeskData[] = [];
    const find = (id: string) => roster.find((d) => d.id === id);

    const handle = (ev: StreamEvent): Result | null => {
      switch (ev.type) {
        case 'error':
          throw new Error(ev.message);
        case 'start': {
          const lead = toDesk(ev.lead, 0);
          roster = [lead];
          setDesks(roster);
          setWorkingAgentIds([lead.id]);
          setActiveAgentIds([lead.id]);
          say(lead, '요청을 분석하고 최적의 전문가를 가상 오피스에 배치하고 있어요', 'start');
          return null;
        }
        case 'plan': {
          const lead = roster[0];
          const team = ev.experts.map((x, i) => toDesk(x, i + 1));
          roster = [lead, ...team];
          setDesks(roster);
          setWorkingAgentIds(team.map((t) => t.id));
          setActiveAgentIds(team.map((t) => t.id));
          say(lead, `${team.length}명을 오피스 데스크에 배치했습니다${ev.reason ? `. (${ev.reason})` : ''}`, 'plan');
          team.forEach((t) => say(t, `맡은 일: ${t.name}`, 'task'));
          return null;
        }
        case 'agent': {
          playKeyClick(); // 작업 완료 시 타건음
          const d = find(ev.id);
          setWorkingAgentIds((w) => w.filter((x) => x !== ev.id));
          setTexts((t) => ({ ...t, [ev.id]: ev.text }));
          if (ev.status === 'error') {
            setFailedAgentIds((f) => [...f, ev.id]);
            setActiveAgentIds((a) => a.filter((x) => x !== ev.id));
          }
          if (d) say(d, ev.status === 'error' ? `작업 실패 (${brief(ev.text)})` : brief(ev.text), 'end');
          return null;
        }
        case 'synthesis': {
          const lead = roster[0];
          setWorkingAgentIds([lead.id]);
          setActiveAgentIds((a) => [...a, lead.id]);
          say(lead, '전문가들의 개별 산출물을 검토하여 하나의 종합 보고서로 완성하고 있어요', 'synth');
          return null;
        }
        case 'final':
          playDoneChime(); // 종합 완료 차임벨
          return ev.data;
      }
    };

    try {
      const payload: any = { query };
      if (customTeam.length > 0) {
        payload.selected_expert_ids = customTeam.map((c) => c.id);
      }

      const res = await fetch('/api/office/dispatch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) throw new Error('서버 연결 실패');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let final: Result | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (myRun !== runId.current) {
          reader.cancel();
          return;
        }
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as StreamEvent;
            const r = handle(ev);
            if (r) final = r;
          } catch (err: any) {
            setError(err?.message || '처리 중 오류가 발생했습니다.');
          }
        }
      }
      if (final && myRun === runId.current) {
        setResult(final);
        setWorkingAgentIds([]);
        setActiveAgentIds(final.experts.map((x) => x.id));
      }
    } catch (err: any) {
      if (myRun === runId.current) {
        setError(err?.message || '연결에 실패했습니다.');
        setWorkingAgentIds([]);
      }
    } finally {
      if (myRun === runId.current) setIsLoading(false);
    }
  };

  const reset = () => {
    runId.current++;
    setFeed([]);
    setDesks([]);
    setFailedAgentIds([]);
    setTexts({});
    setResult(null);
    setActiveAgentIds([]);
    setQuery('');
    setShowRecipeCard(false);
    setError(null);
  };

  const selectedAgent = desks.find((d) => d.id === selectedAgentId) || null;
  const resultTeam = result ? result.experts.map((x, i) => toDesk(x, i + 1)) : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-slate-900 font-sans">
      {/* 1. 상단 글로벌 네비게이션 HUD */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mark />
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-slate-900">Gon Studio</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                AI Virtual Office
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTargetSlotIndex(null);
                setIsRosterOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-all"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>전문가 인재풀 (46명)</span>
            </button>

            {pool && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium px-2.5 py-1 rounded-full bg-slate-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{pool.mode === 'ai' ? 'Gemini AI 연동' : '로컬 모드'}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 2. 메인 가상 오피스 스테이지 */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-8">
        {/* 헤드라인 및 커맨드 입력창 */}
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              가상 오피스 멀티에이전트 스튜디오
            </h1>
            <p className="text-sm text-slate-600 mt-1.5">
              원하는 업무를 한 줄로 지시하면, Gon이 46명의 스킬 전문가를 소집해 각 데스크에서 분담 실행합니다.
            </p>
          </div>

          <form onSubmit={handleDispatch} className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="예: 동네 감성 카페 오픈 이벤트 인스타 홍보글 써줘"
                  className="w-full h-12 bg-white border border-slate-300 rounded-xl px-4 text-base placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="h-12 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.01]"
              >
                <ArrowUp className="w-4 h-4" aria-hidden />
                <span>{isLoading ? '오피스 가동 중' : '업무 지시하기'}</span>
              </button>
            </div>

            {/* 수동 출근 팀이 지정되어 있는 경우 알림 태그 */}
            {customTeam.length > 0 && (
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  지정 출근 팀 ({customTeam.length}명):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {customTeam.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-[11px]"
                    >
                      {c.name}
                      <button
                        type="button"
                        onClick={() => setCustomTeam((prev) => prev.filter((x) => x.id !== c.id))}
                        className="hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomTeam([])}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline ml-1"
                  >
                    AI 자동 소집으로 전환
                  </button>
                </div>
              </div>
            )}

            {/* 샘플 지시 칩 */}
            {!result && !isLoading && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-500">추천 업무:</span>
                {SAMPLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="h-7 px-3 rounded-full border border-slate-300 bg-white text-xs text-slate-600 hover:text-emerald-800 hover:border-emerald-600 shadow-sm transition-colors"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            )}
          </form>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* 3. 인터랙티브 가상 오피스 스테이지 (Virtual Office Floor) */}
        <section className="space-y-3">
          <OfficeFloor
            desks={desks}
            activeAgentIds={activeAgentIds}
            failedAgentIds={failedAgentIds}
            workingAgentIds={workingAgentIds}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onOpenRosterSlot={(slotIdx) => {
              setTargetSlotIndex(slotIdx);
              setIsRosterOpen(true);
            }}
            onOpenRosterPool={() => {
              setTargetSlotIndex(null);
              setIsRosterOpen(true);
            }}
            currentQuery={query}
          />
        </section>

        {/* 4. 실시간 에이전트 작업 스트림 로그 */}
        <ActivityFeed items={feed} live={isLoading} />

        {/* 로딩 스켈레톤 인디케이터 */}
        {isLoading && !result && desks.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5 animate-pulse shadow-sm">
            <div className="h-3.5 rounded-full bg-slate-200 w-11/12" />
            <div className="h-3.5 rounded-full bg-slate-200 w-9/12" />
            <div className="h-3.5 rounded-full bg-slate-200 w-10/12" />
          </section>
        )}

        {/* 5. 오피스 통합 결과물 & AI 리터러시 코치 뷰어 */}
        {result && (
          <section className="space-y-6 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">오피스 통합 산출물</h2>
              </div>
              <ExportActionBar
                query={result.query}
                content={result.final_content}
                team={resultTeam}
                promptCoachTip={result.prompt_coach_tip}
                showRecipeCard={showRecipeCard}
                onToggleRecipeCard={() => setShowRecipeCard(!showRecipeCard)}
              />
            </div>

            {/* 소셜 공유용 프롬프트 레시피 카드 */}
            {showRecipeCard && (
              <div className="transition-all">
                <PromptRecipeCard query={result.query} team={resultTeam} promptCoachTip={result.prompt_coach_tip} />
              </div>
            )}

            {/* 메인 결과 리포트 본문 */}
            <article className="rounded-2xl border border-slate-300 bg-white p-6 sm:p-8 text-[15px] leading-relaxed text-slate-800 shadow-sm whitespace-pre-wrap font-sans">
              {result.final_content}
            </article>

            {/* 전문가별 개별 기여 내역 아코디언 */}
            <details className="rounded-xl border border-slate-200 bg-white group overflow-hidden shadow-sm">
              <summary className="px-5 py-4 text-sm font-bold text-slate-800 cursor-pointer select-none hover:bg-slate-50 transition-colors flex items-center justify-between">
                <span>전문가별 개별 작업 기록 열람 ({result.experts.length}명)</span>
                <span className="text-xs text-slate-400 font-normal">자세히 보기 ▼</span>
              </summary>
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {result.experts.map((x) => {
                  const entry = result.agent_logs[x.id];
                  const failed = entry?.status === 'failed';
                  return (
                    <article key={x.id} className="p-5 sm:p-6 bg-slate-50/50">
                      <header className="flex items-center gap-2.5 mb-2.5">
                        <Avatar accent={x.accent} name={x.name} size={30} />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{x.name}</h3>
                          <p className="text-xs text-slate-500">{x.task}</p>
                        </div>
                      </header>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${failed ? 'text-rose-600' : 'text-slate-700'}`}>
                        {failed ? `작업 실패: ${entry?.log}` : entry?.log}
                      </p>
                    </article>
                  );
                })}
              </div>
            </details>

            {/* AI 리터러시 사후 코칭 (Prompt Coach) 카드 */}
            <aside className="rounded-2xl bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI 리터러시 성장 코치 (Prompt Level-Up)</span>
                </div>
                <p className="text-sm sm:text-base leading-relaxed text-slate-200">
                  {result.prompt_coach_tip}
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>새로운 업무 지시</span>
              </button>
            </aside>
          </section>
        )}
      </main>

      {/* 6. 인재풀 사이드 드로어 */}
      <RosterDrawer
        isOpen={isRosterOpen}
        onClose={() => {
          setIsRosterOpen(false);
          setTargetSlotIndex(null);
        }}
        targetSlotIndex={targetSlotIndex}
        onSelectExpert={handleSelectExpert}
        currentTeamIds={customTeam.map((c) => c.id)}
      />

      {/* 7. 에이전트 개별 모니터 터미널 모달 */}
      <AgentTerminalModal
        agent={selectedAgent}
        log={selectedAgentId ? texts[selectedAgentId] : undefined}
        onClose={() => setSelectedAgentId(null)}
      />

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Gon Studio · 전국민 AI 평준화 가상 오피스
      </footer>
    </div>
  );
}

export default App;
