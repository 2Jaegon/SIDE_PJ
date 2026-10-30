import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { tintFor } from '../Avatar';
import { useTheme, type Theme } from '../../theme';
import { Gon, LANE_W, Layout, Track, V2, routeOf, seatOf, slotOf, spawnOf } from './layout';

export type ScreenState = 'off' | 'working' | 'done';
export type WorkerPhase = 'arriving' | 'seated' | 'out' | 'hand' | 'back';

export interface SceneWorker {
  id: string;
  accent: string;
  screen: ScreenState;
  working: boolean;
  deliverSlot?: number; // 정해지면 결과를 들고 총괄 자리로 간다
}

interface SceneProps {
  camera: THREE.OrthographicCamera;
  layout: Layout;
  gon: Gon;
  seats: number; // 그릴 책상 수. 전문가가 없으면 빈 책상
  workers: SceneWorker[];
  gonWorking: boolean;
  reduced: boolean;
  fitKey: string;
  onPhase: (id: string, phase: WorkerPhase) => void;
}

const PALETTE: Record<Theme, Record<string, string>> = {
  light: {
    zone: '#ebeae5',
    gon: '#efe6d2',
    slab: '#c9c8c1',
    grid: '#d9d8d2',
    deskTop: '#fbfaf7',
    deskLeg: '#c4c3bc',
    chair: '#cdccc5',
    bezel: '#2c2c2a',
    screenOff: '#cfcec8',
    screenOn: '#f7f7f4',
    accent: '#8c6a28',
    ink: '#1a1a18',
    figure: '#1a1a18',
    head: '#f1efe9',
  },
  dark: {
    zone: '#1c1814',
    gon: '#2b2316',
    slab: '#0f0d0a',
    grid: '#2c2720',
    deskTop: '#3a342b',
    deskLeg: '#575044',
    chair: '#463f34',
    bezel: '#0a0908',
    screenOff: '#1a1713',
    screenOn: '#f3e6c4',
    accent: '#d97757',
    ink: '#d9d2c3',
    figure: '#8a7440',
    head: '#e8dcc0',
  },
};
// 장면 안의 모든 재질이 이 객체를 읽는다. OfficeScene이 테마에 맞춰 값을 바꾸고 다시 그린다.
const C = { ...PALETTE.light };

const SPEED = 3.4; // 걷는 속도(m/s)
const HAND_S = 0.9; // 총괄 자리에서 결과를 건네는 시간
const ARRIVE_GAP = 0.14; // 전문가가 한 명씩 나오는 간격

const lerpAngle = (a: number, b: number, k: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

const mix = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);

// ---------- 바닥 ----------
const Floor = ({ L, gon }: { L: Layout; gon: Gon }) => {
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let x = 0; x <= L.width + 0.001; x += 1) pts.push(L.x0 + x, 0.004, L.z0, L.x0 + x, 0.004, L.z0 + L.depth);
    for (let z = 0; z <= L.depth + 0.001; z += 1) pts.push(L.x0, 0.004, L.z0 + z, L.x0 + L.width, 0.004, L.z0 + z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [L.x0, L.z0, L.width, L.depth]);
  useEffect(() => () => grid.dispose(), [grid]);
  const patch = gon.patch;

  return (
    <group>
      {/* 전문가 사무실 바닥 */}
      <mesh position={[L.x0 + L.width / 2, -0.15, L.z0 + L.depth / 2]}>
        <boxGeometry args={[L.width, 0.3, L.depth]} />
        <meshLambertMaterial color={C.zone} />
      </mesh>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color={C.grid} />
      </lineSegments>
      <mesh position={[L.x0 + L.width / 2, -0.32, L.z0 + L.depth / 2]}>
        <boxGeometry args={[L.width - 0.1, 0.04, L.depth - 0.1]} />
        <meshBasicMaterial color={C.slab} />
      </mesh>

      {/* 사무실 바닥 앞쪽 끝에서 총괄 자리 바닥까지 이어지는 길 */}
      {gon.path.slice(1).map(([x, z], k) => {
        const [px, pz] = gon.path[k];
        const horizontal = Math.abs(x - px) > Math.abs(z - pz);
        const len = Math.abs(x - px) + Math.abs(z - pz) + LANE_W;
        return (
          <mesh key={k} position={[(x + px) / 2, -0.15, (z + pz) / 2]}>
            <boxGeometry args={horizontal ? [len, 0.3, LANE_W] : [LANE_W, 0.3, len]} />
            <meshLambertMaterial color={C.gon} />
          </mesh>
        );
      })}

      {/* 총괄 자리 바닥 */}
      {patch && (
        <group position={[patch.cx, 0, patch.cz]}>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[patch.w, 0.3, patch.d]} />
            <meshLambertMaterial color={C.gon} />
          </mesh>
          <mesh position={[0, 0.006, patch.d / 2 - 0.04]}>
            <boxGeometry args={[patch.w, 0.012, 0.07]} />
            <meshLambertMaterial color={C.accent} />
          </mesh>
          <mesh position={[0, -0.32, 0]}>
            <boxGeometry args={[patch.w - 0.1, 0.04, patch.d - 0.1]} />
            <meshBasicMaterial color={C.slab} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------- 모니터 화면 ----------
const BAR_W = [0.68, 0.54, 0.62];

const Screen = ({ state, reduced }: { state: ScreenState; reduced: boolean }) => {
  const bars = useRef<(THREE.Group | null)[]>([]);
  useFrame((s) => {
    if (state !== 'working') return;
    bars.current.forEach((g, k) => {
      if (g) g.scale.x = reduced ? 1 : 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(s.clock.elapsedTime * 3.4 - k * 1.1));
    });
    if (!reduced) s.invalidate();
  });
  return (
    <group position={[0, 0.55, 0.04]}>
      <mesh>
        <planeGeometry args={[0.82, 0.46]} />
        <meshBasicMaterial color={state === 'off' ? C.screenOff : C.screenOn} />
      </mesh>
      {state === 'working' &&
        BAR_W.map((w, k) => (
          // 왼쪽 끝을 고정해 오른쪽으로 늘었다 줄어든다
          <group key={k} ref={(g) => (bars.current[k] = g)} position={[-0.34, 0.12 - k * 0.12, 0.005]}>
            <mesh position={[w / 2, 0, 0]}>
              <planeGeometry args={[w, 0.05]} />
              <meshBasicMaterial color={C.accent} />
            </mesh>
          </group>
        ))}
      {state === 'done' && (
        <group position={[0, 0, 0.005]}>
          <mesh position={[-0.07, -0.04, 0]} rotation={[0, 0, -0.78]}>
            <planeGeometry args={[0.1, 0.045]} />
            <meshBasicMaterial color={C.accent} />
          </mesh>
          <mesh position={[0.07, 0.02, 0]} rotation={[0, 0, 0.78]}>
            <planeGeometry args={[0.24, 0.045]} />
            <meshBasicMaterial color={C.accent} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------- 책상 ----------
const Desk = ({ x, z, screen, reduced }: { x: number; z: number; screen: ScreenState; reduced: boolean }) => {
  const w = 2.0;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[w, 0.1, 1.1]} />
        <meshLambertMaterial color={C.deskTop} />
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.1), 0.4, sz * 0.45]}>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshLambertMaterial color={C.deskLeg} />
        </mesh>
      )))}
      {/* 모니터: 화면이 카메라 쪽으로 살짝 돌아가 있다 */}
      <group position={[0.55, 0.9, 0.02]} rotation={[0, 0.42, 0]}>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.08, 0.28, 0.08]} />
          <meshLambertMaterial color={C.bezel} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.42, 0.04, 0.3]} />
          <meshLambertMaterial color={C.bezel} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.92, 0.56, 0.06]} />
          <meshLambertMaterial color={C.bezel} />
        </mesh>
        <Screen state={screen} reduced={reduced} />
      </group>
      <mesh position={[-0.35, 0.9, 0.32]}>
        <boxGeometry args={[0.55, 0.03, 0.2]} />
        <meshLambertMaterial color={C.deskLeg} />
      </mesh>
    </group>
  );
};

const Chair = ({ x, z }: { x: number; z: number }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 0.46, 0]}>
      <boxGeometry args={[0.62, 0.08, 0.6]} />
      <meshLambertMaterial color={C.chair} />
    </mesh>
    <mesh position={[0, 0.8, -0.3]}>
      <boxGeometry args={[0.62, 0.64, 0.07]} />
      <meshLambertMaterial color={C.chair} />
    </mesh>
    <mesh position={[0, 0.23, 0]}>
      <boxGeometry args={[0.08, 0.46, 0.08]} />
      <meshLambertMaterial color={C.deskLeg} />
    </mesh>
  </group>
);

// ---------- 사람 ----------
interface Ctl {
  moving: boolean;
  seated: boolean;
  working: boolean;
}

const Figure = ({ accent, body, head, ctl, reduced }: { accent?: string; body?: string; head?: string; ctl: MutableRefObject<Ctl>; reduced: boolean }) => {
  const tint = tintFor(accent ?? '');
  const bodyColor = body ?? mix(tint.bg, tint.fg, 0.42).getStyle();
  const headColor = head ?? tint.bg;
  const legColor = body ? C.ink : tint.fg;
  const hip = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Group>(null!);
  const legR = useRef<THREE.Group>(null!);
  const handL = useRef<THREE.Mesh>(null!);
  const handR = useRef<THREE.Mesh>(null!);

  useFrame((s, dt) => {
    const c = ctl.current;
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 14);
    const t = s.clock.elapsedTime;
    const walk = c.moving && !reduced ? Math.sin(t * 10) : 0;
    const hipY = (c.seated ? 0.62 : 0.8) + Math.abs(walk) * 0.04;
    hip.current.position.y += (hipY - hip.current.position.y) * k;
    const legTarget = c.seated ? -1.45 : 0;
    legL.current.rotation.x += (legTarget + walk * 0.7 - legL.current.rotation.x) * Math.max(k, 0.5);
    legR.current.rotation.x += (legTarget - walk * 0.7 - legR.current.rotation.x) * Math.max(k, 0.5);
    const typing = c.working && c.seated && !reduced;
    handL.current.position.y += (0.42 + (typing ? Math.max(0, Math.sin(t * 11)) * 0.06 : 0) - handL.current.position.y) * 0.6;
    handR.current.position.y += (0.42 + (typing ? Math.max(0, Math.sin(t * 11 + Math.PI)) * 0.06 : 0) - handR.current.position.y) * 0.6;
    handL.current.position.z += ((c.seated ? 0.4 : 0.12 + walk * 0.18) - handL.current.position.z) * 0.6;
    handR.current.position.z += ((c.seated ? 0.4 : 0.12 - walk * 0.18) - handR.current.position.z) * 0.6;
    if (typing) s.invalidate();
  });

  return (
    <group scale={0.82}>
      <group ref={hip} position={[0, 0.8, 0]}>
        {[-1, 1].map((sx) => (
          <group key={sx} ref={sx < 0 ? legL : legR} position={[sx * 0.16, 0, 0]}>
            <mesh position={[0, -0.4, 0]}>
              <boxGeometry args={[0.22, 0.8, 0.22]} />
              <meshLambertMaterial color={legColor} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.3, 0.45, 4, 14]} />
          <meshLambertMaterial color={bodyColor} />
        </mesh>
        <mesh ref={handL} position={[-0.4, 0.42, 0.12]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshLambertMaterial color={legColor} />
        </mesh>
        <mesh ref={handR} position={[0.4, 0.42, 0.12]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshLambertMaterial color={legColor} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.3, 20, 16]} />
          <meshLambertMaterial color={headColor} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.11, 1.28, 0.27]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color={C.ink} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// 총괄: 늘 앉아 있고, 편성하거나 종합하는 동안 타이핑한다. 전문가와 구분되도록 어두운 몸에 밝은 머리
const GonFigure = ({ working, reduced }: { working: boolean; reduced: boolean }) => {
  const ctl = useRef<Ctl>({ moving: false, seated: true, working });
  ctl.current.working = working;
  const invalidate = useThree((s) => s.invalidate);
  const settle = useRef(0);
  useEffect(() => {
    settle.current = 0;
    invalidate();
  }, [working, reduced, invalidate]);
  // 수요 렌더링이라, 서 있는 자세에서 앉는 자세로 보간되는 동안은 프레임을 계속 요청한다
  useFrame((s) => {
    if (settle.current++ < 40) s.invalidate();
  });
  return <Figure body={C.figure} head={C.head} ctl={ctl} reduced={reduced} />;
};

// ---------- 걷는 전문가 ----------
type Mode = 'wait' | 'in' | 'seated' | 'out' | 'hand' | 'back';

interface WorkerProps {
  worker: SceneWorker;
  index: number;
  layout: Layout;
  gon: Gon;
  reduced: boolean;
  onPhase: (id: string, phase: WorkerPhase) => void;
}

const Worker = ({ worker, index, layout: L, gon, reduced, onPhase }: WorkerProps) => {
  const root = useRef<THREE.Group>(null!);
  const ctl = useRef<Ctl>({ moving: false, seated: false, working: false });
  const run = useRef({ mode: 'wait' as Mode, t: 0, delivered: false, track: new Track(), facing: 0 });
  const live = useRef({ worker, L, gon, reduced });
  live.current = { worker, L, gon, reduced };
  const invalidate = useThree((s) => s.invalidate);

  const spawn = spawnOf(gon);
  const slotRef = useRef<V2>(spawn);

  useLayoutEffect(() => {
    const r = run.current;
    if (r.mode === 'seated' || r.mode === 'wait') {
      const seat = seatOf(L, index);
      if (r.mode === 'seated') {
        root.current.position.set(seat[0], 0, seat[1]);
      } else {
        root.current.position.set(spawn[0], 0, spawn[1]);
      }
    } else {
      // 걷는 도중 배치가 바뀌면 책상에 앉은 것으로 정리한다
      r.mode = 'seated';
      const seat = seatOf(L, index);
      root.current.position.set(seat[0], 0, seat[1]);
    }
    invalidate();
  }, [L, gon, index, invalidate]);

  useEffect(() => {
    invalidate();
  }, [worker.deliverSlot, worker.working, reduced, invalidate]);

  useFrame((s, dt) => {
    const r = run.current;
    const { worker: w, L: lay, gon: g0, reduced: red } = live.current;
    const step = Math.min(dt, 0.05);
    const g = root.current;
    const c = ctl.current;
    c.working = w.working;
    const setPhase = (p: WorkerPhase) => onPhase(w.id, p);

    const walk = () => {
      const done = r.track.advance(step * SPEED, red);
      const p = r.track.at();
      g.position.set(p.x, 0, p.z);
      if (p.heading !== null) r.facing = p.heading;
      return done;
    };

    if (r.mode === 'wait') {
      r.t += step;
      if (r.t >= index * ARRIVE_GAP || red) {
        r.mode = 'in';
        r.track.set([...routeOf(lay, index, g0, spawnOf(g0))].reverse());
        setPhase('arriving');
      }
    }
    if (r.mode === 'in') {
      c.moving = !red;
      c.seated = false;
      if (walk()) {
        r.mode = 'seated';
        setPhase('seated');
      }
    }
    if (r.mode === 'seated') {
      c.moving = false;
      c.seated = true;
      r.facing = 0;
      const seat = seatOf(lay, index);
      g.position.set(seat[0], 0, seat[1]);
      if (w.deliverSlot !== undefined && !r.delivered) {
        r.delivered = true;
        slotRef.current = slotOf(g0, w.deliverSlot);
        r.track.set(routeOf(lay, index, g0, slotRef.current));
        r.mode = 'out';
        setPhase('out');
      }
    }
    if (r.mode === 'out') {
      c.moving = !red;
      c.seated = false;
      if (walk()) {
        r.mode = 'hand';
        r.t = 0;
        setPhase('hand');
      }
    }
    if (r.mode === 'hand') {
      c.moving = false;
      r.facing = 0; // 건네는 동안 총괄(아래쪽)을 본다
      r.t += step;
      if (r.t >= (red ? 0.35 : HAND_S)) {
        r.track.set([...routeOf(lay, index, g0, slotRef.current)].reverse());
        r.mode = 'back';
        setPhase('back');
      }
    }
    if (r.mode === 'back') {
      c.moving = !red;
      c.seated = false;
      if (walk()) {
        r.mode = 'seated';
        setPhase('seated');
      }
    }
    g.rotation.y = red ? r.facing : lerpAngle(g.rotation.y, r.facing, 1 - Math.exp(-step * 12));
    if (r.mode !== 'seated' || (w.deliverSlot !== undefined && !r.delivered)) s.invalidate();
  });

  return (
    <group ref={root} position={[spawn[0], 0, spawn[1]]}>
      <Figure accent={worker.accent} ctl={ctl} reduced={reduced} />
    </group>
  );
};

// ---------- 장면 ----------
const Invalidator = ({ dep }: { dep: string }) => {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [dep, invalidate]);
  return null;
};

const Scene = ({ layout: L, gon, seats, workers, gonWorking, reduced, onPhase }: Omit<SceneProps, 'camera' | 'fitKey'>) => {
  const gonScreen: ScreenState = gonWorking ? 'working' : 'off';
  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 12, 8]} intensity={1.8} />
      <Floor L={L} gon={gon} />

      {Array.from({ length: seats }, (_, i) => {
        const w = workers[i];
        const [dx, dz] = L.desks[i];
        const seat = seatOf(L, i);
        return (
          <group key={w ? w.id : `empty-${i}`}>
            <Desk x={dx} z={dz} screen={w ? w.screen : 'off'} reduced={reduced} />
            <Chair x={seat[0]} z={seat[1]} />
          </group>
        );
      })}

      {workers.map((w, i) => (
        <Worker key={w.id} worker={w} index={i} layout={L} gon={gon} reduced={reduced} onPhase={onPhase} />
      ))}

      {/* 총괄 자리: 아래쪽 총괄 카드 안의 자리 창 맨 아래에 붙어 있고, 총괄이 책상 뒤에 앉아 사무실 쪽을 본다 */}
      {gon.patch && (
        <group position={[gon.x, 0, gon.z]} rotation={[0, Math.PI, 0]}>
          <Desk x={0} z={0} screen={gonScreen} reduced={reduced} />
          <Chair x={-0.5} z={-1.05} />
          <group position={[-0.5, 0, -1.05]}>
            <GonFigure working={gonWorking} reduced={reduced} />
          </group>
        </group>
      )}
    </>
  );
};

export const OfficeScene = ({ camera, fitKey, ...rest }: SceneProps) => {
  const theme = useTheme();
  Object.assign(C, PALETTE[theme]);
  return (
  <Canvas
    orthographic
    camera={camera}
    frameloop="demand"
    dpr={[1, 2]}
    flat
    gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
    // r3f는 기본으로 pointer-events: auto를 줘서, 채팅 위까지 늘어난 캔버스가 입력창 클릭을 가로챈다
    style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
  >
    <Invalidator dep={`${fitKey}:${theme}`} />
    <Scene {...rest} />
  </Canvas>
  );
};
