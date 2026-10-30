import { useState, useEffect, useRef, useMemo } from 'react';
import { OfficeFloor, DeskData } from './components/OfficeFloor';
import { AgentTerminalModal } from './components/AgentTerminalModal';
import { ConfirmModal, ConfirmModalState } from './components/ConfirmModal';
import { ChatThread, Composer } from './components/ChatPanel';
import { RosterDrawer, ExpertItem } from './components/RosterDrawer';
import { Sidebar } from './components/Sidebar';
import { FeedItem } from './components/ActivityFeed';
import { LoginPage } from './components/LoginPage';
import { Mark } from './components/Mark';
import { Attachment, MAX_ATTACHMENTS, fromDataUrl, toAttachment } from './attachments';
import { Depth, LlmInfo, PoolSummary, StreamEvent, Result, Turn, toDesk } from './types';
import { lensSummary } from './components/TeamControls';
import { AuthUser, getMeApi, logoutApi } from './auth';
import { fetchHistoryApi, saveHistoryTurnApi, clearHistoryApi, HistoryItem } from './history';

const HISTORY_CHARS = 4000; // 이전 답 하나를 맥락으로 보낼 때의 최대 글자 수
const convOf = (t: Turn) => t.conv ?? 0;

const brief = (text: string) => {
  const first = (text.split('\n').find((l) => l.trim()) || '').replace(/^[•\-\s]+/, '');
  return first.length > 90 ? `${first.slice(0, 89)}…` : first;
};

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [pool, setPool] = useState<PoolSummary | null>(null);
  const [desks, setDesks] = useState<DeskData[]>([]);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conv, setConv] = useState(0); // 지금 보고 있는 대화
  const [activeAgentIds, setActiveAgentIds] = useState<string[]>([]);
  const [workingAgentIds, setWorkingAgentIds] = useState<string[]>([]);
  const [failedAgentIds, setFailedAgentIds] = useState<string[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'office' | 'chat'>('office');
  const [unread, setUnread] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [customTeam, setCustomTeam] = useState<ExpertItem[]>([]);
  const [images, setImages] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState('');
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  const runId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  // 인증 상태 확인
  useEffect(() => {
    getMeApi()
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const storageKey = user ? `gon.turns.${user.id}` : 'gon.turns.anon';

  // 대화 히스토리 로드 (localStorage 즉시 로드 + 서버 동기화)
  useEffect(() => {
    if (authLoading) return;

    let loaded = false;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTurns(parsed);
          setConv(Math.max(...parsed.map(convOf), 0));
          runId.current = Math.max(...parsed.map((t: Turn) => t.id || 0), 0);
          loaded = true;
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage turns:', e);
    }

    // 서버 히스토리 동기화
    fetchHistoryApi().then((items: HistoryItem[]) => {
      if (items.length > 0 && !loaded) {
        const serverTurns: Turn[] = items.map((item: HistoryItem, idx: number) => ({
          id: idx + 1,
          conv: (item as any).conv ?? (idx + 1),
          query: item.query,
          images: [],
          feed: item.feed || [],
          result: item.result,
          error: null,
          card: false,
          done: true,
        }));
        setTurns(serverTurns);
        runId.current = Math.max(runId.current, serverTurns.length);
      }
    });
  }, [storageKey, authLoading]);

  // 대화 히스토리 로컬스토리지 저장
  useEffect(() => {
    if (!authLoading && turns.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(turns));
      } catch (e) {
        console.warn('Failed to save turns to localStorage:', e);
      }
    }
  }, [turns, storageKey, authLoading]);

  const refreshPool = () => {
    fetch('/api/office/pool')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPool)
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/office/pool')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPool)
      .catch(() => setPool(null));
  }, []);

  const llm: LlmInfo | null = pool?.llm ?? null;

  // 고른 모델은 연결된 AI마다 따로 기억한다. 목록에 없으면(모델이 바뀌었거나 AI가 바뀜) 첫 번째(기본)로 돌아간다
  const [model, setModel] = useState('');
  useEffect(() => {
    const list = llm?.models ?? [];
    let saved: string | null = null;
    try {
      saved = llm?.kind ? localStorage.getItem(`gon.model.${llm.kind}`) : null;
    } catch {
      // 저장소를 못 쓰면 기본 모델
    }
    setModel(list.some((m) => m.id === saved) ? (saved as string) : list[0]?.id ?? '');
  }, [llm?.kind, llm?.models]);
  const [depth, setDepth] = useState<Depth>(() => {
    try {
      const d = localStorage.getItem('gon.depth');
      return d === 'fast' || d === 'deep' ? d : 'normal';
    } catch {
      return 'normal';
    }
  });
  const chooseDepth = (d: Depth) => {
    setDepth(d);
    try {
      localStorage.setItem('gon.depth', d);
    } catch {
      // 이번 세션에만 적용
    }
  };
  const chooseModel = (id: string) => {
    setModel(id);
    try {
      if (llm?.kind) localStorage.setItem(`gon.model.${llm.kind}`, id);
    } catch {
      // 이번 세션에만 적용
    }
  };
  const convTurns = turns.filter((t) => convOf(t) === conv);

  // 사이드바 대화 목록: 대화(conv)별로 묶어 가장 최근에 대화가 오간 대화가 맨 위로 오도록 최신순(내림차순) 정렬
  const sidebarTurns = useMemo(() => {
    const convMap = new Map<number, { first: Turn; latest: Turn }>();
    for (const t of turns) {
      const c = convOf(t);
      const cur = convMap.get(c);
      if (!cur) {
        convMap.set(c, { first: t, latest: t });
      } else {
        if (t.id < cur.first.id) cur.first = t;
        if (t.id > cur.latest.id) cur.latest = t;
      }
    }
    // latest.id 기준 내림차순(가장 최근 대화가 맨 위)으로 정렬
    return Array.from(convMap.values())
      .sort((a, b) => b.latest.id - a.latest.id)
      .map((entry) => entry.first);
  }, [turns]);

  // 채팅 큰 화면 펼치기/접기 (사무실 위를 덮도록 확장). 버튼은 입력창의 보내기 버튼 옆에 있다
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  useEffect(() => {
    if (!isChatExpanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsChatExpanded(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isChatExpanded]);

  const handleLogout = async () => {
    await logoutApi();
    setUser(null);
    reset();
  };

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

  const addFiles = async (files: File[]) => {
    setNotice('');
    const room = MAX_ATTACHMENTS - images.length;
    if (files.length > room) setNotice(`이미지는 ${MAX_ATTACHMENTS}장까지 첨부할 수 있어요.`);
    const picked = await Promise.allSettled(files.slice(0, Math.max(room, 0)).map(toAttachment));
    const ok = picked.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const bad = picked.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (bad) setNotice(bad.reason instanceof Error ? bad.reason.message : '이미지를 첨부하지 못했어요.');
    if (ok.length > 0) setImages((prev) => [...prev, ...ok].slice(0, MAX_ATTACHMENTS));
  };

  // 보내기·다시 생성·질문 수정이 모두 여기로 온다. replaceId가 있으면 그 질문과 답을 새것으로 바꾼다.
  const dispatch = async (query: string, sent: Attachment[], replaceId?: number) => {
    if ((!query && sent.length === 0) || isLoading) return;

    // 같은 대화의 이전 질문과 답을 맥락으로 보낸다(바꾸는 질문과 그 뒤는 빼고)
    const before = replaceId ? convTurns.slice(0, convTurns.findIndex((t) => t.id === replaceId)) : convTurns;
    const history = before.flatMap((t) =>
      t.result
        ? [
            { role: 'user' as const, content: t.query },
            { role: 'assistant' as const, content: t.result.final_content.slice(0, HISTORY_CHARS) },
          ]
        : [],
    );

    const myRun = ++runId.current;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const patch = (fn: (t: Turn) => Turn) => setTurns((ts) => ts.map((t) => (t.id === myRun ? fn(t) : t)));

    const fresh: Turn = { id: myRun, conv, query, images: sent.map((i) => i.url), feed: [], result: null, error: null, card: false, done: false };
    setTurns((ts) => [...ts.filter((t) => t.id !== replaceId), fresh]);
    setDraft('');
    setImages([]);
    setNotice('');
    setIsLoading(true);
    setFailedAgentIds([]);
    setTexts({});
    setActiveAgentIds([]);
    setWorkingAgentIds([]);
    setDesks([]);
    setTab('office');

    const say = (d: DeskData, text: string, key: string) =>
      patch((t) => {
        const item: FeedItem = { id: `${d.id}-${key}-${t.feed.length}`, character: d.character_name, accent: d.accent, text };
        return { ...t, feed: [...t.feed, item] };
      });

    let roster: DeskData[] = [];
    const find = (id: string) => roster.find((d) => d.id === id);

    const syncLlm = (nextLlm?: LlmInfo) => {
      if (!nextLlm) return;
      setPool((prev) => (prev ? { ...prev, llm: nextLlm } : prev));
    };

    const handle = (ev: StreamEvent): Result | null => {
      switch (ev.type) {
        case 'error':
          throw new Error(ev.message);
        case 'start': {
          syncLlm(ev.llm);
          const lead = toDesk(ev.lead, 0);
          roster = [lead];
          setDesks(roster);
          setWorkingAgentIds([lead.id]);
          setActiveAgentIds([lead.id]);
          say(lead, '요청을 분석해서 필요한 전문가를 고르고 있어요', 'start');
          return null;
        }
        case 'plan': {
          syncLlm(ev.llm);
          const lead = roster[0];
          patch((t) => ({ ...t, route: ev.route ?? 'team' }));
          if (ev.route === 'direct') {
            say(lead, '팀 없이 바로 답할게요', 'direct');
            return null;
          }
          const team = ev.experts.map((x, i) => toDesk(x, i + 1));
          roster = [lead, ...team];
          setDesks(roster);
          setWorkingAgentIds(team.map((t) => t.id));
          setActiveAgentIds(team.map((t) => t.id));
          say(lead, `${team.length}명을 책상에 앉혔어요(${lensSummary(ev.experts)})${ev.reason ? `. ${ev.reason}` : ''}`, 'plan');
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
        case 'delta':
          patch((t) => ({ ...t, answer: (t.answer ?? '') + ev.text }));
          return null;
        case 'final':
          syncLlm(ev.llm);
          return ev.data;
      }
    };

    try {
      const payload: {
        query: string;
        selected_expert_ids?: string[];
        images?: { mime: string; data: string }[];
        history: { role: 'user' | 'assistant'; content: string }[];
        model?: string;
        depth: Depth;
      } = { query, history, depth, ...(model ? { model } : {}) };
      if (sent.length > 0) payload.images = sent.map(({ mime, data }) => ({ mime, data }));
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
        patch((t) => ({ ...t, result: final, answer: undefined, done: true }));
        setWorkingAgentIds([]);
        setActiveAgentIds(final.experts.map((x) => x.id));
        if (tabRef.current === 'office') setUnread(true);
        saveHistoryTurnApi(query, final, []).catch(() => {});
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
      if (myRun === runId.current) {
        setIsLoading(false);
        refreshPool();
      }
    }
  };

  const handleDispatch = () => dispatch(draft.trim(), images);

  const regenerate = (turnId: number) => {
    const t = turns.find((x) => x.id === turnId);
    if (t) dispatch(t.query, t.images.map(fromDataUrl), turnId);
  };

  const editQuestion = (turnId: number, text: string) => {
    const t = turns.find((x) => x.id === turnId);
    if (t) dispatch(text, t.images.map(fromDataUrl), turnId);
  };

  const stop = () => abortRef.current?.abort();

  // 새 대화: 이전 대화 히스토리는 보존하고 현재 화면/입력 상태만 초기화
  const handleNewChat = () => {
    abortRef.current?.abort();
    setConv(Math.max(...turns.map(convOf), conv) + 1);
    setIsLoading(false);
    setDesks([]);
    setFailedAgentIds([]);
    setTexts({});
    setActiveAgentIds([]);
    setWorkingAgentIds([]);
    setDraft('');
    setImages([]);
    setNotice('');
    setUnread(false);
    setTab('chat');
  };

  const reset = () => {
    runId.current++;
    abortRef.current?.abort();
    setIsLoading(false);
    setDesks([]);
    setFailedAgentIds([]);
    setTexts({});
    setActiveAgentIds([]);
    setWorkingAgentIds([]);
    setDraft('');
    setImages([]);
    setNotice('');
    setUnread(false);
  };

  // 모든 채팅 삭제 (claude.ai 확인 대화상자 문구 및 스타일)
  const handleClearHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: '모든 채팅을 삭제하시겠습니까?',
      message: '저장된 모든 채팅 기록이 영구적으로 삭제됩니다. 삭제된 채팅은 복구할 수 없습니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      isDestructive: true,
      onConfirm: async () => {
        setTurns([]);
        setConv(0);
        try {
          localStorage.removeItem(storageKey);
        } catch {}
        await clearHistoryApi();
        reset();
      },
    });
  };

  // 단일 채팅 삭제 (claude.ai 확인 대화상자 문구 및 스타일)
  const handleDeleteConv = (convId: number, _query: string) => {
    setConfirmModal({
      isOpen: true,
      title: '채팅을 삭제하시겠습니까?',
      message: '이 채팅이 영구적으로 삭제됩니다. 삭제된 채팅은 복구할 수 없습니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      isDestructive: true,
      onConfirm: async () => {
        setTurns((prev) => {
          const next = prev.filter((t) => (t.conv ?? t.id) !== convId);
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {}
          return next;
        });
        if (conv === convId) {
          setConv(0);
          reset();
        }
      },
    });
  };

  const jumpToTurn = (id: number) => {
    const t = turns.find((x) => x.id === id);
    if (t) setConv(convOf(t));
    setTab('chat');
    setUnread(false);
    requestAnimationFrame(() => document.getElementById(`turn-${id}`)?.scrollIntoView({ block: 'start' }));
  };

  const openRoster = (slot: number | null) => {
    setTargetSlotIndex(slot);
    setIsRosterOpen(true);
  };

  const selectedAgent = desks.find((d) => d.id === selectedAgentId) || null;
  const last = convTurns[convTurns.length - 1];
  const planning = isLoading && desks.length <= 1;
  const delivered = !!last?.result;

  if (authLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-ground text-faint">
        <div className="flex flex-col items-center gap-3 anim-rise">
          <Mark size={40} />
          <span className="text-xs font-medium">연결 중...</span>
        </div>
      </div>
    );
  }

  // 로그인하지 않았으면 로그인 화면 표시
  if (!user) {
    return (
      <LoginPage onAuthSuccess={setUser} />
    );
  }

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
    <div className="h-dvh flex flex-col lg:flex-row isolate text-ink font-sans bg-ground overflow-hidden">
      <Sidebar
        turns={sidebarTurns}
        currentConv={conv}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onNew={handleNewChat}
        onJump={jumpToTurn}
        onClearHistory={handleClearHistory}
        onDeleteConv={handleDeleteConv}
        pool={pool}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden">
        {/* 데스크톱: 위는 사무실(전문가 책상 + 오른편 총괄 아바타 자리), 아래는 가로 전체를 채우는 대화창 */}
        <main className="relative flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_clamp(320px,42vh,460px)]">
          <div role="tablist" className="lg:hidden shrink-0 flex bg-ground border-b border-line">
            {tabBtn('office', '사무실')}
            {tabBtn('chat', '대화')}
          </div>

          {/* 사무실 3D 캔버스 (총괄 아바타 자리 포함) */}
          <div className={`${tab === 'office' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0 min-h-0 lg:col-start-1 lg:row-start-1 lg:rounded-none lg:border-b lg:border-line lg:border-t-0 lg:border-x-0 bg-ground overflow-hidden`}>
            <OfficeFloor
              desks={desks}
              activeAgentIds={activeAgentIds}
              failedAgentIds={failedAgentIds}
              workingAgentIds={workingAgentIds}
              finished={delivered}
              planning={planning}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              onOpenRosterSlot={openRoster}
            />
          </div>

          {/* 대화 패널 (하단 가로 전체 100% 채움, 펼쳤을 때 사무실 위를 덮도록 z-40 및 absolute 확장) */}
          <div
            className={`${tab === 'chat' ? 'flex-1' : 'shrink-0'} order-2 lg:order-none lg:flex-1 flex flex-col min-w-0 min-h-0 bg-ground ${
              isChatExpanded
                ? 'fixed inset-0 z-50 lg:absolute lg:inset-0 lg:z-40 lg:rounded-none lg:border-0 anim-rise'
                : 'relative z-20 lg:col-start-1 lg:row-start-2 lg:rounded-none lg:border-0'
            } overflow-hidden transition-all duration-200 ease-out`}
          >
            <section aria-label="대화" className={`${tab === 'chat' ? 'block' : 'hidden'} lg:block flex-1 min-h-0`}>
              <ChatThread
                turns={convTurns}
                llm={llm}
                busy={isLoading}
                onToggleCard={(id) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, card: !t.card } : t)))}
                onRegenerate={regenerate}
                onEdit={editQuestion}
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
                onRemoveMember={(id) => setCustomTeam((prev) => prev.filter((x) => x.id !== id))}
                onClearTeam={() => setCustomTeam([])}
                images={images}
                notice={notice}
                onFiles={addFiles}
                onRemoveImage={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
                llm={llm}
                model={model}
                onModel={chooseModel}
                depth={depth}
                depthCaps={pool?.depths}
                onDepth={chooseDepth}
                isExpanded={isChatExpanded}
                onToggleExpand={() => setIsChatExpanded((prev) => !prev)}
              />
            </div>
          </div>
        </main>
      </div>

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

      <ConfirmModal
        state={confirmModal}
        onClose={() => setConfirmModal(null)}
      />
    </div>
  );
}

export default App;
