import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { ThinkingOrb, type OrbState } from 'thinking-orbs';
import { OfficeScene, SceneWorker, WorkerPhase } from './office3d/OfficeScene';
import { Gon, TILT_DEFAULT, TILT_MAX, TILT_MIN, bestCols, fallbackGon, fitCamera, makeCamera, makeLayout, projectTo } from './office3d/layout';
import { useReducedMotion } from './office3d/useReducedMotion';
import { useTheme } from '../theme';

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
  finished?: boolean;
  planning?: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onOpenRosterSlot?: (slotIndex: number) => void;
  homeRef?: React.RefObject<HTMLElement>;
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
  if (s === 'reporting' && walk === 'out') return '시그널 송신 중';
  if (s === 'reporting' && walk === 'hand') return '결과 전달 중';
  return ({ idle: '대기', working: '작업 중', reporting: '보고 완료', done: '완료', failed: '실패' } as Record<Phase, string>)[s];
};

// 역할 및 작업 상태에 따른 libraries.dev/orbs의 공식 9가지 ThinkingOrb 상태 매핑
const getOrbState = (d: DeskData, st: Phase): OrbState => {
  if (st === 'working') {
    const text = `${d.role_korean} ${d.description || ''} ${d.name}`.toLowerCase();
    if (text.includes('개발') || text.includes('코드') || text.includes('엔지니어') || text.includes('api')) return 'solving';
    if (text.includes('조사') || text.includes('리서치') || text.includes('탐색') || text.includes('검색')) return 'searching';
    if (text.includes('기획') || text.includes('전략') || text.includes('아키텍트') || text.includes('관리')) return 'weaving';
    if (text.includes('디자인') || text.includes('ui') || text.includes('ux') || text.includes('시각')) return 'shaping';
    if (text.includes('작성') || text.includes('글') || text.includes('정리') || text.includes('종합')) return 'composing';
    return 'working';
  }
  if (st === 'reporting') return 'connecting';
  if (st === 'done') return 'breathing';
  return 'breathing';
};

class SceneBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="absolute inset-x-0 top-4 text-center text-sm text-faint">이 기기에서는 3D 넥서스를 그릴 수 없어요. 아래 목록은 그대로 쓸 수 있어요.</p>
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
  const theme = useTheme();
  const camera = useMemo(makeCamera, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TILT_KEY, String(tilt));
    } catch {
      /* 저장 실패 무시 */
    }
  }, [tilt]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const workers = useMemo(() => {
    const seen = new Set<string>();
    const list: DeskData[] = [];
    for (const d of desks) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        list.push(d);
      }
    }
    return list;
  }, [desks]);

  const seats = workers.length > 0 ? workers.length : EMPTY_SEATS;
  const layout = useMemo(() => makeLayout(seats, bestCols(seats, box.w, box.h, tilt)), [seats, box.w, box.h, tilt]);

  const canvasH = box.h;
  const view = useMemo(() => {
    if (box.w < 2 || box.h < 2) return null;
    fitCamera(camera, box.w, box.h, canvasH, layout, tilt);
    const gon: Gon = fallbackGon(layout);
    return {
      gon,
      // 2D 이름표 투영 위치 (단상 앞쪽 바닥)
      labels: layout.desks.map(([x, z]) => projectTo(camera, box.w, canvasH, [x, 0, z + 0.65])),
      // 단상 중심 상공 투영 위치 (ThinkingOrb 64px 부유 위치)
      orbs: layout.desks.map(([x, z]) => projectTo(camera, box.w, canvasH, [x, 0.85, z])),
      // 총괄 제단 상공 투영 위치
      gonOrb: projectTo(camera, box.w, canvasH, [gon.x, 1.1, gon.z]),
      labelW: Math.max(76, Math.min(116, camera.zoom * 3)),
    };
  }, [camera, box.w, box.h, canvasH, layout, tilt]);

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

  const stateKey = workers.map((w) => `${w.id}:${stateOf(w.id)}`).join('|');

  useEffect(() => {
    for (const w of workers) {
      if (workingAgentIds.includes(w.id)) {
        started.current.add(w.id);
      }
    }
    setSlots((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const w of workers) {
        const finishedWork = started.current.has(w.id) && !workingAgentIds.includes(w.id);
        if (finishedWork && next[w.id] === undefined) {
          next[w.id] = slotCount.current++;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [stateKey, workers, workingAgentIds]);

  const onPhase = useCallback((id: string, phase: WorkerPhase) => {
    setWalk((prev) => (prev[id] === phase ? prev : { ...prev, [id]: phase }));
  }, []);

  const sceneWorkers: SceneWorker[] = useMemo(() => {
    return workers.map((d) => {
      const st = stateOf(d.id);
      return {
        id: d.id,
        accent: d.accent,
        screen: st === 'done' || st === 'reporting' ? 'done' : st === 'working' ? 'working' : 'off',
        working: st === 'working',
        deliverSlot: slots[d.id],
      };
    });
  }, [workers, stateKey, slots]);

  const gonWorking = planning || workingAgentIds.includes('lead');
  const busy = workingAgentIds.length > 0 || planning;
  const fitKey = `${box.w}x${box.h}:${layout.cols}x${layout.rows}:${tilt}`;

  return (
    <section aria-label="넥서스" className="h-full flex flex-col min-h-0 min-w-0">
      <div className="flex items-center gap-2.5 px-4 h-10 shrink-0 border-b border-line bg-ground lg:rounded-none">
        <span className="shrink-0 flex items-center justify-center">
          <ThinkingOrb state={busy ? 'working' : 'breathing'} size={20} dark={theme === 'dark'} />
        </span>
        <h2 className="text-sm font-semibold text-ink">넥서스</h2>
        <span className="text-sm text-faint">{planning ? '팀 편성 중' : workers.length > 0 ? `${workers.length}개 노드 활성` : '대기 중'}</span>
      </div>

      <div
        ref={stageRef}
        onMouseDown={(e) => e.button === 1 && e.preventDefault()}
        onPointerDown={onTiltStart}
        onPointerMove={onTiltMove}
        onPointerUp={onTiltEnd}
        onPointerCancel={onTiltEnd}
        className="relative flex-1 min-h-[260px] bg-ground overflow-hidden lg:rounded-none"
      >
        {/* 3D 넥서스 단상 플랫폼 씬 */}
        {view && (
          <div aria-hidden className="absolute left-0 top-0 z-10 pointer-events-none" style={{ width: box.w, height: canvasH }}>
            <SceneBoundary>
              <OfficeScene
                camera={camera}
                layout={layout}
                gon={view.gon}
                seats={seats}
                workers={sceneWorkers}
                selectedId={selectedAgentId}
                gonWorking={gonWorking}
                reduced={reduced}
                fitKey={fitKey}
                onPhase={onPhase}
              />
            </SceneBoundary>
          </div>
        )}

        {/* 3D 단상 상공에 직접 부유하는 libraries.dev/orbs 공식 ThinkingOrb (size=64) */}
        {view && view.orbs.map((pos, i) => {
          const d = workers[i];

          // 1) 빈 단상: 은은한 대기 호흡(breathing) 상태로 상공에 부유하며, 클릭 시 슬롯 열기 연동
          if (!d) {
            return (
              <div
                key={`empty-orb-${i}`}
                onClick={() => onOpenRosterSlot?.(i)}
                className={`pointer-events-auto absolute flex flex-col items-center justify-center transition-all duration-300 ${
                  onOpenRosterSlot ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
                }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 24,
                }}
                title={onOpenRosterSlot ? `${i + 1}번 단상에 전문가 배치` : `${i + 1}번 단상 (대기 중)`}
              >
                <div className="rounded-full p-1 opacity-45 hover:opacity-90 transition-opacity duration-300">
                  <ThinkingOrb
                    state="breathing"
                    size={64}
                    dark={theme === 'dark'}
                  />
                </div>
              </div>
            );
          }

          // 2) 전문가 배치 단상: 직무 및 작업 진행 상태에 맞는 실시간 애니메이션 Orb 부유
          const st = stateOf(d.id);
          const isSelected = selectedAgentId === d.id;
          const orbState = getOrbState(d, st);

          return (
            <div
              key={`thinking-orb-64-${d.id}`}
              onClick={() => onSelectAgent(d.id)}
              className="pointer-events-auto absolute flex flex-col items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 35 : 26,
              }}
              title={`${d.character_name} (${d.role_korean}) - ${statusText(st, walk[d.id])}`}
            >
              <div className={`rounded-full p-1.5 transition-all duration-300 ${isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-ground shadow-xl scale-105' : 'hover:drop-shadow-md'}`}>
                <ThinkingOrb
                  state={orbState}
                  size={64}
                  dark={theme === 'dark'}
                  paused={st === 'failed'}
                />
              </div>
            </div>
          );
        })}

        {/* 총괄(Gon) 제단 상공 libraries.dev/orbs 공식 ThinkingOrb (size=64) */}
        {view && view.gon && (
          <div
            onClick={() => onSelectAgent('lead')}
            className="pointer-events-auto absolute flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              left: view.gonOrb.x,
              top: view.gonOrb.y,
              transform: 'translate(-50%, -50%)',
              zIndex: selectedAgentId === 'lead' ? 35 : 26,
            }}
            title="총괄 코어 (Gon)"
          >
            <div className={`rounded-full p-1.5 transition-all duration-300 ${selectedAgentId === 'lead' ? 'ring-2 ring-accent ring-offset-2 ring-offset-ground shadow-xl scale-105' : 'drop-shadow-md'}`}>
              <ThinkingOrb
                state={gonWorking ? 'weaving' : 'breathing'}
                size={64}
                dark={theme === 'dark'}
              />
            </div>
            <span className={`mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md backdrop-blur-xs transition-colors duration-200 ${
              selectedAgentId === 'lead'
                ? 'bg-accent text-surface ring-1 ring-accent'
                : 'bg-surface/95 ring-1 ring-accent/50 text-accent'
            }`}>
              Gon 총괄
            </span>
          </div>
        )}

        {/* 2D 이름표 및 액션 버튼 (단상 앞쪽에 정렬) */}
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
                      aria-label={`${i + 1}번 자리에 전문가 배치`}
                      className="pointer-events-auto w-8 h-8 rounded-full border border-dashed border-faint bg-ground text-faint inline-flex items-center justify-center hover:border-accent hover:text-accent hover:bg-surface disabled:hover:border-faint disabled:hover:text-faint disabled:hover:bg-ground transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                ))
              : workers.map((d, i) => {
                  const st = stateOf(d.id);
                  const isSelected = selectedAgentId === d.id;
                  const isWorking = st === 'working';
                  const isDone = st === 'done' || st === 'reporting';
                  const isFailed = st === 'failed';

                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onSelectAgent(d.id)}
                      aria-label={`${d.character_name} 작업 기록 열기`}
                      className={`pointer-events-auto group absolute left-0 top-0 rounded-lg px-2 py-1 text-center backdrop-blur-xs transition-all duration-200 ease-out ${
                        isSelected
                          ? 'bg-surface ring-2 ring-accent shadow-md scale-105 z-10'
                          : isWorking
                          ? 'bg-surface/95 ring-1 ring-accent/60 shadow-[0_0_12px_rgba(var(--c-accent),0.2)] hover:bg-surface hover:scale-[1.03]'
                          : isDone
                          ? 'bg-surface/90 ring-1 ring-line/80 hover:bg-surface hover:ring-accent/40 hover:scale-[1.02]'
                          : 'bg-surface/75 ring-1 ring-line/50 hover:bg-surface hover:scale-[1.02]'
                      }`}
                      style={{ width: view.labelW, transform: `translate(${view.labels[i].x - view.labelW / 2}px, ${view.labels[i].y}px)` }}
                    >
                      {isDone && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface ring-1 ring-accent text-[9px] text-accent font-bold" aria-hidden="true">
                          ✓
                        </span>
                      )}

                      <div className="flex items-center justify-center gap-1 min-w-0">
                        <span
                          className={`text-xs font-semibold truncate transition-colors ${
                            isSelected ? 'text-accent' : isWorking ? 'text-ink font-bold' : isDone ? 'text-ink' : 'text-faint group-hover:text-ink'
                          }`}
                        >
                          {d.character_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-1 mt-0.5 min-w-0">
                        <span
                          className={`text-[10px] tracking-tight truncate ${
                            isFailed
                              ? 'text-critical font-medium'
                              : isWorking
                              ? 'text-accent font-medium'
                              : isDone
                              ? 'text-faint'
                              : 'text-faint/70'
                          }`}
                        >
                          {statusText(st, walk[d.id])}
                        </span>
                      </div>
                    </button>
                  );
                })}
          </div>
        )}
      </div>
    </section>
  );
};
