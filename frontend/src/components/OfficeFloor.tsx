import React, { useEffect, useState } from 'react';
import { Pin, Plus } from 'lucide-react';
import { Person, DeskFurniture, Spot, spotStyle, DeskScreen } from './OfficeSprites';

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
  currentQuery?: string;
}

// 바닥 치수(px). 책상 위 칸은 총괄, 그 아래 줄이 전문가 책상이다.
const DESK_W = 120;
const LEAD_Y = 52; // 총괄 책상 윗변
const QUEUE_FEET_Y = 170; // 보고하러 온 전문가가 서는 줄의 발 위치
const WORKER_Y = 228; // 첫 줄 전문가 책상 윗변
const ROW_H = 152;
const EMPTY_SEATS = 4;
const SEAT_DX = -26; // 앉은 사람은 책상 중심에서 왼쪽, 모니터는 오른쪽
const SURFACE = 26; // 책상 윗변에서 앉은 사람 발까지

const useWide = () => {
  const q = '(min-width: 640px)';
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia(q).matches));
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
};

const statusText = (s: 'idle' | 'working' | 'reporting' | 'done' | 'failed') =>
  ({ idle: '대기', working: '작업 중', reporting: '보고하는 중', done: '완료', failed: '실패' })[s];

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
  currentQuery = '',
}) => {
  const wide = useWide();
  const leadDesk = desks.find((d) => d.id === 'lead');
  const workers = desks.filter((d) => d.id !== 'lead');
  const seats = workers.length > 0 ? workers.length : EMPTY_SEATS;
  const cols = wide ? Math.min(seats, 4) : 2;
  const rows = Math.ceil(seats / cols);
  const height = WORKER_Y + (rows - 1) * ROW_H + 110;

  const deskSpot = (i: number): Spot => ({
    xPct: (((i % cols) + 0.5) / cols) * 100,
    dx: 0,
    y: WORKER_Y + Math.floor(i / cols) * ROW_H,
  });
  const seatOf = (d: Spot): Spot => ({ ...d, dx: SEAT_DX, y: d.y + SURFACE });
  const leadSpot: Spot = { xPct: 50, dx: 0, y: LEAD_Y };
  const door: Spot = { xPct: 0, dx: 16, y: height - 16 };

  const stateOf = (id: string) => {
    if (failedAgentIds.includes(id)) return 'failed' as const;
    if (workingAgentIds.includes(id)) return 'working' as const;
    if (activeAgentIds.includes(id)) return finished ? ('done' as const) : ('reporting' as const);
    return 'idle' as const;
  };

  const reportingIds = workers.filter((w) => stateOf(w.id) === 'reporting').map((w) => w.id);
  const leadWorking = !!leadDesk && workingAgentIds.includes(leadDesk.id);

  return (
    <section aria-label="사무실" className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${workingAgentIds.length > 0 || planning ? 'working-dot bg-accent' : 'bg-line'}`}
            aria-hidden
          />
          <h2 className="text-base font-semibold text-ink">사무실</h2>
          <span className="text-sm text-sub">
            {planning
              ? 'Gon이 팀을 편성하고 있어요'
              : workers.length > 0
              ? `${workers.length}명이 일하고 있어요`
              : '요청을 기다리는 중이에요'}
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-5 pt-4">
        <div className="flex items-start gap-2 rounded border border-line bg-ground px-3 py-2.5">
          <Pin className="w-4 h-4 mt-0.5 text-accent shrink-0" aria-hidden />
          <p className={`text-sm leading-6 ${currentQuery ? 'text-ink' : 'text-faint'}`}>
            {currentQuery ? `오늘의 과제: ${currentQuery}` : '요청을 보내면 여기에 과제가 붙고, 전문가들이 입구에서 걸어 들어와 일을 나눠요.'}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div
          className="relative overflow-hidden rounded-lg border border-line bg-ground"
          style={{
            height,
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.035) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        >
          {/* 입구 */}
          <div
            className="absolute left-0 flex items-end text-xs text-faint pl-2 pb-0.5"
            style={{ top: height - 34, width: 64, height: 34, borderTop: '1px solid #c9c8c2', borderRight: '1px solid #c9c8c2' }}
          >
            입구
          </div>

          {/* 총괄 */}
          <div className="absolute z-10" style={{ ...spotStyle(leadSpot), transform: 'translateX(-50%)', width: DESK_W }}>
            <DeskFurniture screen={leadWorking ? 'working' : 'off'} />
          </div>
          <Person accent="emerald" spot={seatOf(leadSpot)} seated working={leadWorking} />
          <div
            className="absolute z-10"
            style={{ left: `calc(50% + ${DESK_W / 2 + 8}px)`, top: LEAD_Y - 6, maxWidth: 120 }}
          >
            {leadDesk ? (
              <button
                type="button"
                onClick={() => onSelectAgent(leadDesk.id)}
                aria-label="Gon 작업 기록 열기"
                className={`text-left rounded px-1.5 py-1 hover:bg-surface transition-colors duration-200 ease-out ${
                  selectedAgentId === leadDesk.id ? 'bg-surface ring-1 ring-accent' : ''
                }`}
              >
                <LeadLabel working={leadWorking} />
              </button>
            ) : (
              <div className="px-1.5 py-1">
                <LeadLabel working={false} />
              </div>
            )}
          </div>

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
                      className="mt-1 w-full rounded px-1 py-1 text-center text-xs text-faint hover:text-accent hover:bg-surface disabled:hover:bg-transparent disabled:hover:text-faint transition-colors duration-200 ease-out"
                    >
                      <span className="block text-sm text-sub">빈 자리 {i + 1}</span>
                      <span className="inline-flex items-center gap-1">
                        <Plus className="w-3 h-3" aria-hidden />
                        전문가 앉히기
                      </span>
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
                      className={`mt-1 w-full rounded px-1 py-1 text-center hover:bg-surface transition-colors duration-200 ease-out ${
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
                        {statusText(st)}
                      </span>
                    </button>
                  </div>
                );
              })}

          {/* 걸어 다니는 전문가들 */}
          {workers.map((d, i) => {
            const st = stateOf(d.id);
            const seat = seatOf(deskSpot(i));
            const k = reportingIds.indexOf(d.id);
            const m = reportingIds.length;
            const queue: Spot = { xPct: 50, dx: (k - (m - 1) / 2) * 36, y: QUEUE_FEET_Y };
            const atLead = st === 'reporting';
            return (
              <Person
                key={d.id}
                accent={d.accent}
                spot={atLead ? queue : seat}
                entrance={door}
                delay={i * 140}
                seated={!atLead}
                working={st === 'working'}
                badge={st === 'done' ? 'done' : st === 'failed' ? 'failed' : null}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

const LeadLabel: React.FC<{ working: boolean }> = ({ working }) => (
  <div>
    <span className="block text-sm font-semibold text-ink">Gon</span>
    <span className={`inline-flex items-center gap-1 text-xs ${working ? 'text-accent' : 'text-faint'}`}>
      {working && <span className="working-dot w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />}
      {working ? '편성·종합 중' : '총괄'}
    </span>
  </div>
);
