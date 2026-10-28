import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { OfficeFloor, DeskData } from './components/OfficeFloor';
import { AgentTerminalModal } from './components/AgentTerminalModal';
import { ChatThread, Composer } from './components/ChatPanel';
import { RosterDrawer, ExpertItem } from './components/RosterDrawer';
import { Mark } from './components/Mark';
import { FeedItem } from './components/ActivityFeed';
import { PoolSummary, StreamEvent, Result, Turn, toDesk } from './types';
import type { Phase } from './components/Orb';

const brief = (text: string) => {
  const first = (text.split('\n').find((l) => l.trim()) || '').replace(/^[•\-\s]+/, '');
  return first.length > 90 ? `${first.slice(0, 89)}…` : first;
};

export function App() {
  const [pool, setPool] = useState<PoolSummary | null>(null);
  const [desks, setDesks] = useState<DeskData[]>([]);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [activeAgentIds, setActiveAgentIds] = useState<string[]>([]);
  const [workingAgentIds, setWorkingAgentIds] = useState<string[]>([]);
  const [failedAgentIds, setFailedAgentIds] = useState<string[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'office' | 'chat'>('office');
  const [unread, setUnread] = useState(false);
  const [phase, setPhase] = useState<Phase>('connect');
  const [teamSize, setTeamSize] = useState(0);
  const [doneCount, setDoneCount] = useState(0);

  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [customTeam, setCustomTeam] = useState<ExpertItem[]>([]);

  const runId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    fetch('/api/office/pool')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPool)
      .catch(() => setPool(null));
  }, []);

  const handleSelectExpert = (expert: ExpertItem, slotIdx: number | null) => {
    setCustomTeam((prev) => {
      if (prev.some((x) => x.id === expert.id)) return prev.filter((x) => x.id !== expert.id);
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

  const handleDispatch = async () => {
    const query = draft.trim();
    if (!query || isLoading) return;

    const myRun = ++runId.current;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const patch = (fn: (t: Turn) => Turn) => setTurns((ts) => ts.map((t) => (t.id === myRun ? fn(t) : t)));

    setTurns((ts) => [...ts, { id: myRun, query, feed: [], result: null, error: null, card: false, done: false }]);
    setDraft('');
    setIsLoading(true);
    setFailedAgentIds([]);
    setTexts({});
    setActiveAgentIds([]);
    setWorkingAgentIds([]);
    setDesks([]);
    setPhase('connect');
    setTeamSize(0);
    setDoneCount(0);
    setTab('office');

    const say = (d: DeskData, text: string, key: string) =>
      patch((t) => {
        const item: FeedItem = { id: `${d.id}-${key}-${t.feed.length}`, character: d.character_name, accent: d.accent, text };
        return { ...t, feed: [...t.feed, item] };
      });

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
          setPhase('plan');
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
          setPhase('work');
          setTeamSize(team.length);
          say(lead, `${team.length}명을 책상에 앉혔어요${ev.reason ? `. ${ev.reason}` : ''}`, 'plan');
          team.forEach((t) => say(t, `맡은 일: ${t.name}`, 'task'));
          return null;
        }
        case 'agent': {
          const d = find(ev.id);
          setDoneCount((n) => n + 1);
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
          setPhase('synth');
          say(lead, '전문가들의 결과를 하나로 합치고 있어요', 'synth');
          return null;
        }
        case 'final':
          return ev.data;
      }
    };

    try {
      const payload: { query: string; selected_expert_ids?: string[] } = { query };
      if (customTeam.length > 0) payload.selected_expert_ids = customTeam.map((c) => c.id);

      const res = await fetch('/api/office/dispatch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');

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
          const r = handle(JSON.parse(line) as StreamEvent);
          if (r) final = r;
        }
      }
      if (myRun === runId.current) {
        if (!final) throw new Error('결과를 받지 못했어요. 다시 시도해 주세요.');
        patch((t) => ({ ...t, result: final, done: true }));
        setWorkingAgentIds([]);
        setActiveAgentIds(final.experts.map((x) => x.id));
        if (tabRef.current === 'office') setUnread(true);
      }
    } catch (err) {
      if (myRun !== runId.current) return;
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      patch((t) => ({
        ...t,
        done: true,
        error: aborted ? '요청을 멈췄어요.' : err instanceof Error ? err.message : '연결에 실패했어요.',
      }));
      setWorkingAgentIds([]);
    } finally {
      if (myRun === runId.current) setIsLoading(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  const reset = () => {
    runId.current++;
    abortRef.current?.abort();
    setIsLoading(false);
    setTurns([]);
    setDesks([]);
    setFailedAgentIds([]);
    setTexts({});
    setActiveAgentIds([]);
    setWorkingAgentIds([]);
    setDraft('');
    setUnread(false);
  };

  const openRoster = (slot: number | null) => {
    setTargetSlotIndex(slot);
    setIsRosterOpen(true);
  };

  const selectedAgent = desks.find((d) => d.id === selectedAgentId) || null;
  const last = turns[turns.length - 1];
  const planning = isLoading && desks.length <= 1;

  const tabBtn = (id: 'office' | 'chat', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => {
        setTab(id);
        if (id === 'chat') setUnread(false);
      }}
      className={`relative flex-1 h-10 text-sm font-medium border-b-2 transition-colors duration-200 ease-out ${
        tab === id ? 'border-accent text-ink' : 'border-transparent text-faint hover:text-ink'
      }`}
    >
      {label}
      {id === 'chat' && unread && <span className="absolute top-2.5 ml-1 w-1.5 h-1.5 rounded-full bg-accent" aria-label="새 결과" />}
    </button>
  );

  return (
    <div className="h-dvh flex flex-col bg-ground text-ink font-sans">
      <header className="shrink-0 h-12 px-4 flex items-center justify-between bg-surface border-b border-line">
        <div className="flex items-center gap-2.5">
          <Mark size={24} />
          <h1 className="font-bold tracking-tight">Gon</h1>
        </div>
        <div className="flex items-center gap-3">
          {pool?.mode === 'stub' && <span className="text-sm text-faint">AI 미연결</span>}
          {turns.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="h-8 px-2.5 rounded border border-line bg-surface text-sm text-ink hover:border-faint inline-flex items-center gap-1.5 transition-colors duration-200 ease-out"
            >
              <Plus className="w-4 h-4" aria-hidden />
              새 대화
            </button>
          )}
        </div>
      </header>

      <div role="tablist" className="lg:hidden shrink-0 flex bg-surface border-b border-line">
        {tabBtn('office', '사무실')}
        {tabBtn('chat', '대화')}
      </div>

      <main className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_480px] lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={`${tab === 'office' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0 min-h-0 lg:col-start-1 lg:row-span-2`}>
          <OfficeFloor
            desks={desks}
            activeAgentIds={activeAgentIds}
            failedAgentIds={failedAgentIds}
            workingAgentIds={workingAgentIds}
            finished={!!last?.result}
            planning={planning}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onOpenRosterSlot={openRoster}
          />
        </div>

        {/* 추후 다른 요소를 넣을 자리 */}
        <div aria-hidden className="hidden lg:block lg:col-start-2 lg:row-start-1 min-h-0 border-l border-line bg-surface" />

        <div
          className={`${tab === 'chat' ? 'flex-1' : 'shrink-0'} lg:flex-1 flex flex-col min-h-0 lg:col-start-2 lg:row-start-2 lg:border-l lg:border-t border-line`}
        >
          <section aria-label="대화" className={`${tab === 'chat' ? 'block' : 'hidden'} lg:block flex-1 min-h-0`}>
            <ChatThread
              turns={turns}
              progress={isLoading ? { phase, total: teamSize, done: doneCount } : null}
              onToggleCard={(id) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, card: !t.card } : t)))}
            />
          </section>
          <div className="shrink-0">
            <Composer
              isLoading={isLoading}
              draft={draft}
              onDraft={setDraft}
              onSend={handleDispatch}
              onStop={stop}
              customTeam={customTeam}
              onOpenRoster={() => openRoster(null)}
              onRemoveMember={(id) => setCustomTeam((prev) => prev.filter((x) => x.id !== id))}
              onClearTeam={() => setCustomTeam([])}
              poolTotal={pool?.total}
            />
          </div>
        </div>
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
    </div>
  );
}

export default App;
