import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, RotateCcw, AlertCircle } from 'lucide-react';
import { OfficeFloor, DeskData } from './components/OfficeFloor';
import { AgentTerminalModal } from './components/AgentTerminalModal';
import { ExportActionBar } from './components/ExportActionBar';
import { PromptRecipeCard } from './components/PromptRecipeCard';
import { ActivityFeed, FeedItem } from './components/ActivityFeed';
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
  '동네 카페 오픈 이벤트 인스타 홍보글 써줘',
  '소상공인 지원사업 신청용 사업계획서 초안',
  '실시간 채팅 기능이 있는 가벼운 백엔드 설계',
  '촌스럽지 않은 포트폴리오 웹사이트 UI 가이드',
];

// 화면 카드가 쓰는 형태로 바꾼다: 제목은 전문가 직함, 부제는 맡은 과업
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

// 작업 기록 한 줄 요약: 첫 줄의 앞부분만
const brief = (text: string) => {
  const first = (text.split('\n').find((l) => l.trim()) || '').replace(/^[•\-\s]+/, '');
  return first.length > 90 ? `${first.slice(0, 89)}…` : first;
};

// 다리(Bridge) 모양의 마크: 두 기둥과 아치
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
  const [booting, setBooting] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const runId = useRef(0); // 새 요청이나 초기화가 들어오면 이전 스트림을 버린다

  useEffect(() => {
    fetch('/api/office/pool')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPool)
      .catch(() => setError('서버에 연결하지 못했어요. 인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.'))
      .finally(() => setBooting(false));
  }, []);

  const say = (d: DeskData, text: string, key: string) =>
    setFeed((f) => [...f, { id: `${d.id}-${key}-${f.length}`, character: d.character_name, accent: d.accent, text }]);

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
    setDesks([]);
    setActiveAgentIds([]);
    setWorkingAgentIds([]);

    let roster: DeskData[] = []; // 스트림 처리 중에는 state가 한 박자 늦어서 지역 변수로 들고 간다
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
          say(lead, '요청을 읽고 필요한 전문가를 고르고 있어요', 'start');
          return null;
        }
        case 'plan': {
          const lead = roster[0];
          const team = ev.experts.map((x, i) => toDesk(x, i + 1));
          roster = [lead, ...team];
          setDesks(roster);
          setWorkingAgentIds(team.map((t) => t.id));
          setActiveAgentIds(team.map((t) => t.id));
          say(lead, `${team.length}명을 배치했어요${ev.reason ? `. ${ev.reason}` : ''}`, 'plan');
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
          if (d) say(d, ev.status === 'error' ? `작업하지 못했어요 (${brief(ev.text)})` : brief(ev.text), 'end');
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
      const res = await fetch('/api/office/dispatch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok || !res.body) throw new Error('연결 실패');

      // 서버가 끝나는 대로 한 줄씩(NDJSON) 보낸다
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
          if (line) final = handle(JSON.parse(line)) ?? final;
        }
      }
      if (myRun !== runId.current) return;
      if (!final) throw new Error('결과를 받지 못했어요');
      setResult(final);
    } catch (err) {
      if (myRun !== runId.current) return;
      setActiveAgentIds([]);
      setError(
        err instanceof Error && err.message && err.message !== '연결 실패'
          ? err.message
          : '요청을 처리하지 못했어요. 잠시 후 다시 보내 주세요.',
      );
    } finally {
      if (myRun === runId.current) {
        setWorkingAgentIds([]);
        setIsLoading(false);
      }
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
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-ground/90 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mark />
            <span className="font-semibold tracking-tight">Gon</span>
            <span className="hidden sm:inline text-sm text-faint">전국민 AI 평준화</span>
          </div>
          {pool && <span className="text-sm text-sub">전문가 {pool.total}명 대기 중</span>}
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1 space-y-10">
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI 전문가 팀에게 일을 맡기세요</h1>
            <p className="text-sm sm:text-base text-sub mt-2">
              한 줄이면 됩니다. Gon이 필요한 전문가를 골라 배치하고, 전문가들이 나눠서 일해요. 다음엔 더 잘 질문하는 법도 알려 드려요.
            </p>
          </div>

          <form onSubmit={handleDispatch} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1">
                <span className="sr-only">요청 내용</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="무엇을 만들고 싶으세요? 예: 모바일 쇼핑몰 화면 기획"
                  className="w-full h-12 bg-surface border border-line rounded px-4 text-base placeholder:text-faint focus:outline-none focus:border-ink transition-colors"
                />
              </label>
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="h-12 px-5 rounded bg-accent hover:bg-accent-hover disabled:bg-sunken disabled:text-sub text-white font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-200"
              >
                <ArrowUp className="w-4 h-4" aria-hidden />
                <span>{isLoading ? '작업 중' : '요청 보내기'}</span>
              </button>
            </div>

            {!result && !isLoading && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-faint">이런 요청은 어때요</span>
                {SAMPLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="h-8 px-3 rounded-full border border-line bg-surface text-xs text-sub hover:text-ink hover:border-faint transition-colors duration-200"
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

        <section className="space-y-3" aria-labelledby="team-title">
          <div className="flex items-baseline justify-between">
            <h2 id="team-title" className="text-base font-semibold">
              사무실 <span className="text-faint font-normal">{desks.length > 0 ? `${desks.length}명 근무 중` : ''}</span>
            </h2>
            {desks.length > 0 && <span className="text-xs text-faint hidden sm:inline">카드를 누르면 작업 내용을 볼 수 있어요</span>}
          </div>

          {desks.length > 0 ? (
            <OfficeFloor
              desks={desks}
              activeAgentIds={activeAgentIds}
              failedAgentIds={failedAgentIds}
              workingAgentIds={workingAgentIds}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
            />
          ) : (
            <div className="rounded border border-dashed border-line bg-surface px-5 py-8 space-y-4" aria-busy={booting}>
              <p className="text-sm text-sub">
                아직 아무도 출근하지 않았어요. 요청을 보내면 <b className="font-semibold text-ink">Gon</b>이 필요한 전문가만 불러 자리를 배치해요.
              </p>
              {pool && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pool.clusters).map(([name, n]) => (
                    <span key={name} className="h-7 px-3 rounded-full border border-line text-xs text-sub inline-flex items-center gap-1.5">
                      {name} <span className="text-faint">{n}</span>
                    </span>
                  ))}
                </div>
              )}
              {pool?.mode === 'stub' && (
                <p className="text-xs text-faint">AI가 연결되지 않아 시험용 결과가 나와요.</p>
              )}
            </div>
          )}
        </section>

        <ActivityFeed items={feed} live={isLoading} />

        {isLoading && !result && desks.length > 0 && (
          <section className="rounded border border-line bg-surface p-6 space-y-2" aria-hidden>
            <div className="h-3 rounded bg-sunken w-11/12" />
            <div className="h-3 rounded bg-sunken w-9/12" />
            <div className="h-3 rounded bg-sunken w-10/12" />
          </section>
        )}

        {result && (
          <section className="anim-rise space-y-5" aria-labelledby="result-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="result-title" className="text-base font-semibold">결과</h2>
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
              <div role="note" className="flex items-start gap-2 rounded border border-line bg-sunken px-4 py-3 text-sm text-sub">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                <span>AI가 연결되지 않아 시험용 결과를 보여 드려요. 실제 작업 결과가 아니에요.</span>
              </div>
            )}

            {showRecipeCard && (
              <div className="anim-rise">
                <PromptRecipeCard query={result.query} team={resultTeam} promptCoachTip={result.prompt_coach_tip} />
              </div>
            )}

            <article className="rounded border border-line bg-surface p-6 sm:p-8 text-[15px] leading-7 whitespace-pre-wrap">
              {result.final_content}
            </article>

            <details className="rounded border border-line bg-surface group">
              <summary className="px-5 py-3.5 text-sm font-semibold cursor-pointer select-none">
                전문가별 작업 보기 <span className="text-faint font-normal">{result.experts.length}명</span>
              </summary>
              <div className="divide-y divide-line border-t border-line">
                {result.experts.map((x) => {
                  const entry = result.agent_logs[x.id];
                  const failed = entry?.status === 'failed';
                  return (
                    <article key={x.id} className="p-5 sm:p-6">
                      <header className="flex items-center gap-2.5 mb-3">
                        <Avatar accent={x.accent} name={x.name} size={28} />
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold leading-4">{x.name}</h3>
                          <p className="text-xs text-sub">{x.task}</p>
                        </div>
                      </header>
                      <p className={`text-[15px] leading-7 whitespace-pre-wrap ${failed ? 'text-danger' : ''}`}>
                        {failed ? `작업하지 못했어요. ${entry?.log}` : entry?.log}
                      </p>
                    </article>
                  );
                })}
              </div>
            </details>

            <aside className="rounded bg-sunken p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-accent">다음엔 이렇게 질문해 보세요</h3>
                <p className="text-sm leading-6">{result.prompt_coach_tip}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line bg-surface text-sm hover:border-faint transition-colors duration-200"
              >
                <RotateCcw className="w-4 h-4" aria-hidden />
                <span>새로 요청하기</span>
              </button>
            </aside>
          </section>
        )}
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-faint">
        Gon · 전국민 AI 평준화
      </footer>

      <AgentTerminalModal
        agent={selectedAgent}
        log={selectedAgentId ? texts[selectedAgentId] : undefined}
        onClose={() => setSelectedAgentId(null)}
      />
    </div>
  );
}

export default App;
