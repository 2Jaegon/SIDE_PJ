import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Person, DeskFurniture, Spot, spotStyle, DeskScreen, WALK_MS } from './OfficeSprites';

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
  finished?: boolean; // 종합까지 끝났는지
  planning?: boolean; // 총괄이 팀을 편성하는 중인지
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onOpenRosterSlot?: (slotIndex: number) => void;
  homeRef?: React.RefObject<HTMLElement>; // 총괄 자리(총괄 Gon 패널). 전문가는 여기서 나와 일하고, 결과를 들고 여기로 돌아온다
}

// 바닥 치수(px). 전문가 책상만 있다. 총괄은 사무실 아래쪽에 이어 붙은 '총괄 Gon' 패널에 있다.
// 바닥이 이보다 크면 남는 높이를 책상 줄 사이와 위아래 여백에 나눠 화면 전체를 쓴다.
const DESK_W = 120;
const HEAD_ROOM = 56; // 첫 줄 책상 위로 튀어나오는 사람 머리 높이
const BLOCK_H = 100; // 책상과 이름·상태 글자까지의 높이
const RESERVE = 28; // 총괄 패널 위쪽 탭이 바닥 아래쪽에 겹치는 만큼 비워 둔다
const ROW_H = 152;
const MAX_ROW_H = 200;
const EMPTY_SEATS = 4;
const SEAT_DX = -26;
const SURFACE = 26;
const STAND = 26; // 총괄 패널 윗변에서 사람 발까지(패널 안쪽으로)
const HANDOFF_MS = 900; // 총괄 자리에서 결과를 건네는 시간
const SPREAD = 30; // 한꺼번에 전달할 때 사람 사이 간격

type Phase = 'idle' | 'working' | 'reporting' | 'done' | 'failed';
type Trip = 'go' | 'back' | 'seat'; // 전달하러 가는 중 / 책상으로 돌아오는 중 / 돌아와 앉음

const statusText = (s: Phase, trip?: Trip) =>
  s === 'reporting' && trip === 'go'
    ? '전달하러 가는 중'
    : ({ idle: '대기', working: '작업 중', reporting: '보고 완료', done: '완료', failed: '실패' } as Record<Phase, string>)[s];

export const OfficeFloor: React.FC<OfficeFloorProps> = ({
  desks,
  activeAgentIds,
  workingAgentIds,
  failedAgentIds = [],
  finished = false,
  planning = false,
  selectedAgentId,
  onSelectAgent,
  onOpenRosterSlot,
  homeRef,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [home, setHome] = useState<{ x: number; y: number } | null>(null);
  const [trips, setTrips] = useState<Record<string, Trip>>({});
  const started = useRef<Set<string>>(new Set());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 총괄 자리의 위치를 바닥 좌표로 잰다. 창 크기, 사이드바 접기, 바닥 스크롤로 상대 위치가 바뀔 때마다 다시 잰다.
  useEffect(() => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!stage) return;
    const measure = () => {
      const panel = homeRef?.current;
      if (!panel) return setHome(null);
      const s = stage.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      if (p.width < 2 || p.height < 2) return setHome(null);
      const x = p.left + p.width / 2 - s.left;
      // 패널이 바닥 아래쪽에 겹쳐 있으면 그 윗변에 서고, 바닥 밖 아래에 붙어 있으면(모바일) 바닥 가장자리에 선다
      const y = p.top < s.bottom ? p.top - s.top + STAND : s.height - 8;
      setHome((prev) => (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5 ? prev : { x, y }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    if (homeRef?.current) ro.observe(homeRef.current);
    window.addEventListener('resize', measure);
    wrap?.addEventListener('scroll', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      wrap?.removeEventListener('scroll', measure);
    };
  }, [homeRef]);

  const workers = desks.filter((d) => d.id !== 'lead');
  const seats = workers.length > 0 ? workers.length : EMPTY_SEATS;
  const cols = box.w >= 560 ? Math.min(seats, 4) : 2;
  const rows = Math.ceil(seats / cols);

  // 책상 줄 전체를 바닥 한가운데에 놓는다. 바닥이 작으면 스크롤된다.
  const minH = HEAD_ROOM + (rows - 1) * ROW_H + BLOCK_H + RESERVE;
  const height = Math.max(minH, box.h);
  const rowH = Math.min(ROW_H + ((height - minH) * 0.4) / rows, MAX_ROW_H);
  const contentH = HEAD_ROOM + (rows - 1) * rowH + BLOCK_H;
  const firstY = HEAD_ROOM + Math.max(height - RESERVE - contentH, 0) / 2;

  const deskSpot = (i: number): Spot => ({
    xPct: (((i % cols) + 0.5) / cols) * 100,
    dx: 0,
    y: firstY + Math.floor(i / cols) * rowH,
  });
  const seatOf = (d: Spot): Spot => ({ ...d, dx: SEAT_DX, y: d.y + SURFACE });
  const homeSpot: Spot = home ? { xPct: 0, dx: home.x, y: home.y } : { xPct: 50, dx: 0, y: height - 10 };

  const stateOf = (id: string): Phase => {
    if (failedAgentIds.includes(id)) return 'failed';
    if (workingAgentIds.includes(id)) return 'working';
    if (activeAgentIds.includes(id)) return finished ? 'done' : 'reporting';
    return 'idle';
  };

  // 일을 마친 전문가는 총괄 자리로 걸어가 결과를 건네고 책상으로 돌아온다. 전문가마다 한 번씩만 간다.
  const stateKey = workers.map((w) => `${w.id}:${stateOf(w.id)}`).join('|');
  useEffect(() => {
    if (workers.length === 0) {
      started.current.clear();
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      setTrips({});
      return;
    }
    for (const w of workers) {
      const st = stateOf(w.id);
      if ((st === 'reporting' || st === 'done') && !started.current.has(w.id)) {
        started.current.add(w.id);
        setTrips((t) => ({ ...t, [w.id]: 'go' }));
        timers.current.push(window.setTimeout(() => setTrips((t) => ({ ...t, [w.id]: 'back' })), WALK_MS + HANDOFF_MS));
        timers.current.push(window.setTimeout(() => setTrips((t) => ({ ...t, [w.id]: 'seat' })), WALK_MS * 2 + HANDOFF_MS + 100));
      }
    }
  }, [stateKey]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const delivering = workers.filter((w) => trips[w.id] === 'go').map((w) => w.id);
  const busy = workingAgentIds.length > 0 || planning;

  return (
    <section aria-label="사무실" className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-4 h-11 shrink-0 border-b border-line bg-surface">
        <span className={`w-2 h-2 rounded-full shrink-0 ${busy ? 'working-dot bg-accent' : 'bg-line'}`} aria-hidden />
        <h2 className="text-sm font-semibold text-ink">사무실</h2>
        <span className="text-sm text-faint">{planning ? '편성 중' : workers.length > 0 ? `${workers.length}명` : '대기 중'}</span>
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 overflow-auto p-3">
        <div ref={stageRef} className="relative" style={{ height }}>
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden rounded-lg border border-line bg-ground"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.035) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* 책상과 사람이 있는 층. 총괄 패널 위에 그려져서, 전문가가 총괄 자리까지 걸어갈 수 있다 */}
          <div className="absolute inset-0 z-30 pointer-events-none">
            {/* 전문가 책상: 비어 있을 때는 빈 자리, 편성되면 편성된 책상 */}
            {workers.length === 0
              ? Array.from({ length: EMPTY_SEATS }, (_, i) => {
                  const s = deskSpot(i);
                  return (
                    <div key={`empty-${i}`} className="absolute z-10" style={{ ...spotStyle(s), transform: 'translateX(-50%)', width: DESK_W }}>
                      <div className="opacity-60">
                        <DeskFurniture screen="off" />
                      </div>
                      <button
                        type="button"
                        disabled={!onOpenRosterSlot}
                        onClick={() => onOpenRosterSlot?.(i)}
                        aria-label={`${i + 1}번 자리에 전문가 앉히기`}
                        className="pointer-events-auto mt-1.5 mx-auto w-8 h-8 rounded-full border border-dashed border-faint text-faint inline-flex items-center justify-center hover:border-accent hover:text-accent hover:bg-surface disabled:hover:border-faint disabled:hover:text-faint disabled:hover:bg-transparent transition-colors duration-200 ease-out"
                      >
                        <Plus className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  );
                })
              : workers.map((d, i) => {
                  const s = deskSpot(i);
                  const st = stateOf(d.id);
                  const screen: DeskScreen = st === 'working' ? 'working' : st === 'done' ? 'done' : 'off';
                  return (
                    <div key={d.id} className="absolute z-10" style={{ ...spotStyle(s), transform: 'translateX(-50%)', width: DESK_W }}>
                      <DeskFurniture screen={screen} />
                      <button
                        type="button"
                        onClick={() => onSelectAgent(d.id)}
                        aria-label={`${d.character_name} 작업 기록 열기`}
                        className={`pointer-events-auto mt-1 w-full rounded px-1 py-1 text-center hover:bg-surface transition-colors duration-200 ease-out ${
                          selectedAgentId === d.id ? 'bg-surface ring-1 ring-accent' : ''
                        }`}
                      >
                        <span className="block text-sm font-semibold text-ink truncate">{d.character_name}</span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            st === 'failed' ? 'text-danger' : st === 'idle' ? 'text-faint' : 'text-accent'
                          }`}
                        >
                          {st === 'working' && <span className="working-dot w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />}
                          {statusText(st, trips[d.id])}
                        </span>
                      </button>
                    </div>
                  );
                })}

            {/* 걸어 다니는 전문가들: 총괄 자리에서 나와 책상에 앉고, 일을 마치면 결과를 들고 총괄 자리로 갔다가 돌아온다 */}
            {workers.map((d, i) => {
              const st = stateOf(d.id);
              const trip = trips[d.id];
              const k = delivering.indexOf(d.id);
              const offset = k < 0 ? 0 : Math.max(-80, Math.min(80, (k - (delivering.length - 1) / 2) * SPREAD));
              const going = trip === 'go';
              return (
                <Person
                  key={d.id}
                  accent={d.accent}
                  spot={going ? { ...homeSpot, dx: homeSpot.dx + offset } : seatOf(deskSpot(i))}
                  entrance={homeSpot}
                  delay={trip ? 0 : i * 140}
                  seated={!going}
                  working={st === 'working'}
                  badge={st === 'done' ? 'done' : st === 'failed' ? 'failed' : null}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
