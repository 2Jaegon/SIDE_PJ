import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { OfficeScene, SceneWorker, WorkerPhase } from './office3d/OfficeScene';
import { Gon, TILT_DEFAULT, TILT_MAX, TILT_MIN, bestCols, fallbackGon, fitCamera, makeCamera, makeLayout, projectTo } from './office3d/layout';
import { useReducedMotion } from './office3d/useReducedMotion';

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
  homeRef?: React.RefObject<HTMLElement>; // 총괄 카드 안의 자리 창. 총괄 책상은 이 창 안에 그려지고, 전문가는 사무실에서 여기까지 걸어온다
}

const EMPTY_SEATS = 4;
const TILT_KEY = 'gon.office.tilt';

const loadTilt = () => {
  try {
    const v = Number(window.localStorage.getItem(TILT_KEY));
    return v >= TILT_MIN && v <= TILT_MAX ? v : TILT_DEFAULT;
  } catch {
    return TILT_DEFAULT;
  }
};

type Phase = 'idle' | 'working' | 'reporting' | 'done' | 'failed';

const statusText = (s: Phase, walk?: WorkerPhase) => {
  if (s === 'reporting' && walk === 'out') return '전달하러 가는 중';
  if (s === 'reporting' && walk === 'hand') return '결과 전달 중';
  return ({ idle: '대기', working: '작업 중', reporting: '보고 완료', done: '완료', failed: '실패' } as Record<Phase, string>)[s];
};

// WebGL을 쓸 수 없는 환경에서도 이름·상태 버튼은 남도록, 3D 장면만 대체 문구로 바꾼다.
class SceneBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="absolute inset-x-0 top-4 text-center text-sm text-faint">이 기기에서는 3D 사무실을 그릴 수 없어요. 아래 목록은 그대로 쓸 수 있어요.</p>
    ) : (
      this.props.children
    );
  }
}

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
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [tilt, setTilt] = useState(loadTilt);
  const [walk, setWalk] = useState<Record<string, WorkerPhase>>({});
  const [slots, setSlots] = useState<Record<string, number>>({});
  const slotCount = useRef(0);
  const started = useRef<Set<string>>(new Set());
  const reduced = useReducedMotion();
  const camera = useMemo(makeCamera, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TILT_KEY, String(tilt));
    } catch {
      /* 저장할 수 없어도 화면은 그대로 쓴다 */
    }
  }, [tilt]);

  // 사무실 영역의 크기를 잰다. 총괄 아바타 자리도 사무실 안에 함께 배치된다.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const w = Math.round(s.width);
      const h = Math.round(s.height);
      setBox((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const workers = desks.filter((d) => d.id !== 'lead');
  const seats = workers.length > 0 ? workers.length : EMPTY_SEATS;
  const layout = useMemo(() => makeLayout(seats, bestCols(seats, box.w, box.h, tilt)), [seats, box.w, box.h, tilt]);

  // 카메라를 전문가 사무실 바닥과 오른편 총괄 자리 바닥 전체에 맞춘다.
  const canvasH = box.h;
  const view = useMemo(() => {
    if (box.w < 2 || box.h < 2) return null;
    fitCamera(camera, box.w, box.h, canvasH, layout, tilt);
    const gon: Gon = fallbackGon(layout);
    return {
      gon,
      labels: layout.desks.map(([x, z]) => projectTo(camera, box.w, canvasH, [x, 0, z + 0.65])),
      labelW: Math.max(76, Math.min(116, camera.zoom * 3)),
    };
  }, [camera, box.w, box.h, canvasH, layout, tilt]);

  // 마우스 휠(가운데) 버튼을 누른 채 위아래로 끌면 기울기가 바뀐다. 아래로 끌면 더 위에서 내려다본다.
  const drag = useRef<{ id: number; y: number } | null>(null);
  const onTiltStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, y: e.clientY };
  };
  const onTiltMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y;
    d.y = e.clientY;
    setTilt((t) => Math.min(TILT_MAX, Math.max(TILT_MIN, Math.round((t + dy * 0.25) * 10) / 10)));
  };
  const onTiltEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const stateOf = (id: string): Phase => {
    if (failedAgentIds.includes(id)) return 'failed';
    if (workingAgentIds.includes(id)) return 'working';
    if (activeAgentIds.includes(id)) return finished ? 'done' : 'reporting';
    return 'idle';
  };

  // 일을 마친 전문가는 총괄 자리로 결과를 들고 간다. 전문가마다 한 번씩만, 먼저 끝난 순서대로 자리를 받는다.
  const stateKey = workers.map((w) => `${w.id}:${stateOf(w.id)}`).join('|');
  useEffect(() => {
    if (workers.length === 0) {
      started.current.clear();
      slotCount.current = 0;
      setSlots({});
      setWalk({});
      return;
    }
    const next: Record<string, number> = {};
    for (const w of workers) {
      const st = stateOf(w.id);
      if ((st === 'reporting' || st === 'done') && !started.current.has(w.id)) {
        started.current.add(w.id);
        next[w.id] = slotCount.current++;
      }
    }
    if (Object.keys(next).length > 0) setSlots((s) => ({ ...s, ...next }));
  }, [stateKey]);

  const onPhase = useCallback((id: string, p: WorkerPhase) => setWalk((m) => (m[id] === p ? m : { ...m, [id]: p })), []);

  const sceneWorkers: SceneWorker[] = workers.map((d) => {
    const st = stateOf(d.id);
    return {
      id: d.id,
      accent: d.accent,
      working: st === 'working',
      screen: st === 'working' ? 'working' : st === 'done' ? 'done' : 'off',
      deliverSlot: slots[d.id],
    };
  });

  const gonWorking = planning || workingAgentIds.includes('lead');
  const busy = workingAgentIds.length > 0 || planning;
  const fitKey = `${box.w}x${box.h}:${layout.cols}x${layout.rows}:${tilt}`;

  return (
    <section aria-label="사무실" className="h-full flex flex-col min-h-0 min-w-0">
      <div className="flex items-center gap-2.5 px-4 h-10 shrink-0 border-b border-line bg-ground lg:rounded-none">
        <span className={`w-2 h-2 rounded-full shrink-0 ${busy ? 'working-dot bg-accent' : 'bg-line'}`} aria-hidden />
        <h2 className="text-sm font-semibold text-ink">사무실</h2>
        <span className="text-sm text-faint">{planning ? '편성 중' : workers.length > 0 ? `${workers.length}명` : '대기 중'}</span>
      </div>

      {/* 3D 사무실 및 오른편 총괄 아바타 자리 */}
      <div
        ref={stageRef}
        onMouseDown={(e) => e.button === 1 && e.preventDefault()} // 가운데 버튼의 자동 스크롤을 막는다
        onPointerDown={onTiltStart}
        onPointerMove={onTiltMove}
        onPointerUp={onTiltEnd}
        onPointerCancel={onTiltEnd}
        className="relative flex-1 min-h-[260px] bg-ground overflow-hidden lg:rounded-none"
      >
        {view && (
          <div aria-hidden className="absolute left-0 top-0 z-20 pointer-events-none" style={{ width: box.w, height: canvasH }}>
            <SceneBoundary>
              <OfficeScene
                camera={camera}
                layout={layout}
                gon={view.gon}
                seats={seats}
                workers={sceneWorkers}
                gonWorking={gonWorking}
                reduced={reduced}
                fitKey={fitKey}
                onPhase={onPhase}
              />
            </SceneBoundary>
          </div>
        )}

        {/* 이름표와 버튼: 3D 책상 앞에 놓인 실제 버튼이라 키보드와 스크린리더로도 쓸 수 있다 */}
        {view && (
          <div className="absolute inset-0 z-30 pointer-events-none">
            {workers.length === 0
              ? layout.desks.map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="absolute left-0 top-0 flex justify-center"
                    style={{ width: view.labelW, transform: `translate(${view.labels[i].x - view.labelW / 2}px, ${view.labels[i].y}px)` }}
                  >
                    <button
                      type="button"
                      disabled={!onOpenRosterSlot}
                      onClick={() => onOpenRosterSlot?.(i)}
                      aria-label={`${i + 1}번 자리에 전문가 앉히기`}
                      className="pointer-events-auto w-8 h-8 rounded-full border border-dashed border-faint bg-ground text-faint inline-flex items-center justify-center hover:border-accent hover:text-accent hover:bg-surface disabled:hover:border-faint disabled:hover:text-faint disabled:hover:bg-ground transition-colors duration-200 ease-out"
                    >
                      <Plus className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                ))
              : workers.map((d, i) => {
                  const st = stateOf(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onSelectAgent(d.id)}
                      aria-label={`${d.character_name} 작업 기록 열기`}
                      className={`pointer-events-auto absolute left-0 top-0 rounded px-1 py-1 text-center hover:bg-surface transition-colors duration-200 ease-out ${
                        selectedAgentId === d.id ? 'bg-surface ring-1 ring-accent' : ''
                      }`}
                      style={{ width: view.labelW, transform: `translate(${view.labels[i].x - view.labelW / 2}px, ${view.labels[i].y}px)` }}
                    >
                      <span className="block text-sm font-semibold text-ink truncate">{d.character_name}</span>
                      <span className={`inline-flex items-center gap-1 text-xs ${st === 'failed' ? 'text-danger' : st === 'idle' ? 'text-faint' : 'text-accent'}`}>
                        {st === 'working' && <span className="working-dot w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />}
                        {statusText(st, walk[d.id])}
                      </span>
                    </button>
                  );
                })}
          </div>
        )}
      </div>
    </section>
  );
};
