import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
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
}

// 바닥 치수(px). 위쪽은 총괄 책상, 그 아래가 보고 줄, 맨 아래 줄들이 전문가 책상이다.
// 바닥이 이보다 크면 남는 높이를 책상 줄 사이에 나눠 화면 전체를 쓴다.
const DESK_W = 120;
const LEAD_Y = 52;
const QUEUE_GAP = 118; // 총괄 책상에서 보고 줄 발까지
const WORKER_GAP = 176; // 총괄 책상에서 첫 전문가 책상까지(최소)
const ROW_H = 152;
const BOTTOM = 110;
const EMPTY_SEATS = 4;
const SEAT_DX = -26;
const SURFACE = 26;

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
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const leadDesk = desks.find((d) => d.id === 'lead');
  const workers = desks.filter((d) => d.id !== 'lead');
  const seats = workers.length > 0 ? workers.length : EMPTY_SEATS;
  const cols = box.w >= 560 ? Math.min(seats, 4) : 2;
  const rows = Math.ceil(seats / cols);

  const minH = LEAD_Y + WORKER_GAP + (rows - 1) * ROW_H + BOTTOM;
  const height = Math.max(minH, box.h);
  const free = height - minH;
  const leadY = LEAD_Y + free * 0.08;
  const workerY = leadY + WORKER_GAP + free * 0.32;
  const rowH = ROW_H + (free * 0.5) / rows;

  const deskSpot = (i: number): Spot => ({
    xPct: (((i % cols) + 0.5) / cols) * 100,
    dx: 0,
    y: workerY + Math.floor(i / cols) * rowH,
  });
  const seatOf = (d: Spot): Spot => ({ ...d, dx: SEAT_DX, y: d.y + SURFACE });
  const leadSpot: Spot = { xPct: 50, dx: 0, y: leadY };
  const door: Spot = { xPct: 0, dx: 16, y: height - 16 };

  const stateOf = (id: string) => {
    if (failedAgentIds.includes(id)) return 'failed' as const;
    if (workingAgentIds.includes(id)) return 'working' as const;
    if (activeAgentIds.includes(id)) return finished ? ('done' as const) : ('reporting' as const);
    return 'idle' as const;
  };

  const reportingIds = workers.filter((w) => stateOf(w.id) === 'reporting').map((w) => w.id);
  const leadWorking = !!leadDesk && workingAgentIds.includes(leadDesk.id);
  const busy = workingAgentIds.length > 0 || planning;

  return (
    <section aria-label="사무실" className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-4 h-11 shrink-0 border-b border-line bg-surface">
        <span className={`w-2 h-2 rounded-full shrink-0 ${busy ? 'working-dot bg-accent' : 'bg-line'}`} aria-hidden />
        <h2 className="text-sm font-semibold text-ink">사무실</h2>
        <span className="text-sm text-faint">{planning ? '편성 중' : workers.length > 0 ? `${workers.length}명` : '대기 중'}</span>
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 overflow-auto p-3">
        <div
          className="relative overflow-hidden rounded-lg border border-line bg-ground"
          style={{
            height,
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.035) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        >
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
          <div className="absolute z-10" style={{ left: `calc(50% + ${DESK_W / 2 + 8}px)`, top: leadY - 6, maxWidth: 120 }}>
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
                      aria-label={`${i + 1}번 자리에 전문가 앉히기`}
                      className="mt-1.5 mx-auto w-8 h-8 rounded-full border border-dashed border-faint text-faint inline-flex items-center justify-center hover:border-accent hover:text-accent hover:bg-surface disabled:hover:border-faint disabled:hover:text-faint disabled:hover:bg-transparent transition-colors duration-200 ease-out"
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
            const queue: Spot = { xPct: 50, dx: (k - (m - 1) / 2) * 36, y: leadY + QUEUE_GAP };
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
