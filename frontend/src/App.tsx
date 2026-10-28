import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, RotateCcw, AlertCircle, Users, Sparkles, X } from 'lucide-react';
import { OfficeFloor, DeskData } from './components/OfficeFloor';
import { AgentTerminalModal } from './components/AgentTerminalModal';
import { ExportActionBar } from './components/ExportActionBar';
import { PromptRecipeCard } from './components/PromptRecipeCard';
import { ActivityFeed, FeedItem } from './components/ActivityFeed';
import { RosterDrawer, ExpertItem } from './components/RosterDrawer';
import { Avatar } from './components/Avatar';

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
          say(lead, '요청을 분석해서 필요한 전문가를 고르고 있어요', 'start');
          return null;
        }
        case 'plan': {
          const lead = roster[0];
          const team = ev.experts.map((x, i) => toDesk(x, i + 1));
          roster = [lead, ...team];
          setDesks(roster);
          setWorkingAgentIds(team.map((t) => t.id));
          setActiveAgentIds(team.map((t) => t.id));
          say(lead, `${team.length}명을 책상에 앉혔어요${ev.reason ? `. ${ev.reason}` : ''}`, 'plan');
          team.forEach((t) => say(t, `맡은 일: ${t.name}`, 'task'));
          return null;
        }
        case 'agent': {
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
          say(lead, '전문가들의 결과를 하나로 합치고 있어요', 'synth');
          return null;
        }
        case 'final':
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

  const planning = isLoading && desks.length <= 1;

  return (
    <div className="min-h-screen flex flex-col bg-ground text-ink font-sans">
      <header className="sticky top-0 z-40 bg-surface border-b border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Mark />
            <span className="font-bold tracking-tight">Gon</span>
            <span className="hidden sm:inline text-sm text-faint">전국민 AI 평준화</span>
          </div>
          <div className="flex items-center gap-3">
            {pool?.mode === 'stub' && <span className="hidden sm:inline text-sm text-faint">AI 미연결 · 시험용 결과</span>}
            <button
              type="button"
              onClick={() => {
                setTargetSlotIndex(null);
                setIsRosterOpen(true);
              }}
              className="h-9 px-3 rounded border border-line bg-surface text-sm font-medium text-ink hover:border-faint inline-flex items-center gap-1.5 transition-colors duration-200 ease-out"
            >
              <Users className="w-4 h-4 text-accent" aria-hidden />
              <span className="sm:hidden">직접 고르기</span>
              <span className="hidden sm:inline">{pool ? `전문가 직접 고르기 (${pool.total}명)` : '전문가 직접 고르기'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 flex-1 space-y-8">
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI 전문가 팀에게 일을 맡기세요</h1>
            <p className="text-base text-sub mt-2 max-w-2xl">
              한 줄이면 됩니다. Gon이 필요한 전문가만 불러 책상에 앉히고, 전문가들이 나눠서 일해요. 다음엔 더 잘 질문하는 법도 알려 드려요.
            </p>
          </div>

          <form onSubmit={handleDispatch} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="요청"
                placeholder="예: 카페 오픈 이벤트 인스타 홍보글"
                className="flex-1 h-12 rounded border border-line bg-surface px-4 text-base text-ink placeholder:text-faint focus:outline-none focus:border-accent transition-colors duration-200 ease-out"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="h-12 px-6 rounded bg-accent text-white font-semibold inline-flex items-center justify-center gap-2 hover:bg-accent-hover disabled:bg-sunken disabled:text-faint transition-colors duration-200 ease-out"
              >
                <ArrowUp className="w-4 h-4" aria-hidden />
                {isLoading ? '일하는 중' : '요청 보내기'}
              </button>
            </div>

            {customTeam.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-sub">
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  <Sparkles className="w-4 h-4 text-accent" aria-hidden />
                  직접 고른 팀 {customTeam.length}명
                </span>
                {customTeam.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full border border-line bg-surface text-ink">
                    {c.name}
                    <button
                      type="button"
                      onClick={() => setCustomTeam((prev) => prev.filter((x) => x.id !== c.id))}
                      aria-label={`${c.name} 빼기`}
                      className="w-5 h-5 rounded-full inline-flex items-center justify-center text-faint hover:text-danger"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
                <button type="button" onClick={() => setCustomTeam([])} className="text-sm text-faint hover:text-ink underline underline-offset-2">
                  Gon이 고르게 하기
                </button>
              </div>
            )}

            {!result && !isLoading && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-faint">이런 요청은 어때요</span>
                {SAMPLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="min-h-8 px-3 py-1 rounded-full border border-line bg-surface text-sm text-sub hover:text-ink hover:border-faint text-left transition-colors duration-200 ease-out"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </form>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </section>

        <OfficeFloor
          desks={desks}
          activeAgentIds={activeAgentIds}
          failedAgentIds={failedAgentIds}
          workingAgentIds={workingAgentIds}
          finished={!!result}
          planning={planning}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          onOpenRosterSlot={(slotIdx) => {
            setTargetSlotIndex(slotIdx);
            setIsRosterOpen(true);
          }}
          currentQuery={isLoading || result ? result?.query ?? query : ''}
        />

        <ActivityFeed items={feed} live={isLoading} />

        {result && (
          <section aria-labelledby="result-title" className="space-y-5 anim-rise">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
              <h2 id="result-title" className="text-lg font-semibold">
                결과
              </h2>
              <ExportActionBar
                query={result.query}
                content={result.final_content}
                team={resultTeam}
                promptCoachTip={result.prompt_coach_tip}
                showRecipeCard={showRecipeCard}
                onToggleRecipeCard={() => setShowRecipeCard(!showRecipeCard)}
              />
            </div>

            {result.mode === 'stub' && (
              <p className="rounded border border-line bg-sunken px-4 py-3 text-sm text-sub">
                AI가 연결되지 않아 시험용 결과예요. 실제 작업은 하지 않았어요.
              </p>
            )}

            {showRecipeCard && <PromptRecipeCard query={result.query} team={resultTeam} promptCoachTip={result.prompt_coach_tip} />}

            <article className="rounded-lg border border-line bg-surface p-6 sm:p-8 text-base leading-7 text-ink whitespace-pre-wrap">
              {result.final_content}
            </article>

            <details className="rounded-lg border border-line bg-surface">
              <summary className="px-5 py-4 text-sm font-medium cursor-pointer select-none hover:bg-ground rounded-lg transition-colors duration-200 ease-out">
                전문가별 작업 기록 ({result.experts.length}명)
              </summary>
              <div className="divide-y divide-line border-t border-line">
                {result.experts.map((x) => {
                  const entry = result.agent_logs[x.id];
                  const failed = entry?.status === 'failed';
                  return (
                    <article key={x.id} className="p-5">
                      <header className="flex items-center gap-2.5 mb-2">
                        <Avatar accent={x.accent} name={x.name} size={30} />
                        <div>
                          <h3 className="text-sm font-semibold">{x.name}</h3>
                          <p className="text-sm text-sub">{x.task}</p>
                        </div>
                      </header>
                      <p className={`text-sm leading-6 whitespace-pre-wrap ${failed ? 'text-danger' : 'text-sub'}`}>
                        {failed ? `작업 실패: ${entry?.log}` : entry?.log}
                      </p>
                    </article>
                  );
                })}
              </div>
            </details>

            <aside className="rounded-lg border border-accent/25 bg-accent-soft p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-accent">다음엔 이렇게 물어보세요</h3>
                <p className="mt-1 text-base leading-7 text-ink">{result.prompt_coach_tip}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 h-10 px-4 rounded border border-accent/40 bg-surface text-sm font-medium text-accent hover:bg-white inline-flex items-center gap-2 transition-colors duration-200 ease-out"
              >
                <RotateCcw className="w-4 h-4" aria-hidden />
                새 요청
              </button>
            </aside>
          </section>
        )}
      </main>

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

      <AgentTerminalModal
        agent={selectedAgent}
        log={selectedAgentId ? texts[selectedAgentId] : undefined}
        onClose={() => setSelectedAgentId(null)}
      />

      <footer className="border-t border-line py-6 text-center text-sm text-faint">Gon · 전국민 AI 평준화</footer>
    </div>
  );
}

export default App;
