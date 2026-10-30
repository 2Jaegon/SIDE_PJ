import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTheme, type Theme } from '../../theme';
import { Gon, Layout } from './layout';

export type ScreenState = 'off' | 'working' | 'done';
export type WorkerPhase = 'arriving' | 'seated' | 'out' | 'hand' | 'back';

export interface SceneWorker {
  id: string;
  accent: string;
  screen: ScreenState;
  working: boolean;
  deliverSlot?: number;
}

interface SceneProps {
  camera: THREE.OrthographicCamera;
  layout: Layout;
  gon: Gon;
  seats: number;
  workers: SceneWorker[];
  selectedId?: string | null;
  gonWorking: boolean;
  reduced: boolean;
  fitKey: string;
  onPhase: (id: string, phase: WorkerPhase) => void;
}

const PALETTE: Record<Theme, Record<string, string>> = {
  light: {
    zone: '#ebeae5',
    pedestal: '#f4f3ef',
    pedestalRim: '#dcdad3',
    altar: '#eee8da',
    slab: '#c9c8c1',
    grid: '#dfded8',
    accent: '#8c6a28',
    ink: '#1a1a18',
    pulseBeam: '#cbb682',
  },
  dark: {
    zone: '#141210',
    pedestal: '#1f1b16',
    pedestalRim: '#352e25',
    altar: '#2b2316',
    slab: '#0a0907',
    grid: '#28231c',
    accent: '#d97757',
    ink: '#d9d2c3',
    pulseBeam: '#e2886c',
  },
};

const C = { ...PALETTE.light };

// ---------- 바닥 넥서스 플랫폼 ----------
const NexusFloor = ({ L, gon }: { L: Layout; gon: Gon }) => {
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let x = 0; x <= L.width + 0.001; x += 1.2) {
      pts.push(L.x0 + x, 0.005, L.z0, L.x0 + x, 0.005, L.z0 + L.depth);
    }
    for (let z = 0; z <= L.depth + 0.001; z += 1.2) {
      pts.push(L.x0, 0.005, L.z0 + z, L.x0 + L.width, 0.005, L.z0 + z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [L.x0, L.z0, L.width, L.depth]);

  useEffect(() => () => grid.dispose(), [grid]);

  return (
    <group>
      {/* 넥서스 베이스 슬래브 */}
      <mesh position={[L.x0 + L.width / 2, -0.16, L.z0 + L.depth / 2]}>
        <boxGeometry args={[L.width, 0.3, L.depth]} />
        <meshLambertMaterial color={C.zone} />
      </mesh>

      {/* 에테르 그리드 라인 */}
      <lineSegments geometry={grid}>
        <lineBasicMaterial color={C.grid} opacity={0.65} transparent />
      </lineSegments>

      {/* 총괄 코어 제단 베이스 */}
      {gon.patch && (
        <mesh position={[gon.x, -0.12, gon.z]}>
          <cylinderGeometry args={[1.5, 1.7, 0.22, 32]} />
          <meshLambertMaterial color={C.altar} />
        </mesh>
      )}
    </group>
  );
};

// ---------- 노드 바닥 펄스 링 ----------
const NodeRings = ({
  working,
  done,
  selected,
  accent,
  reduced,
}: {
  working: boolean;
  done: boolean;
  selected: boolean;
  accent?: string;
  reduced: boolean;
}) => {
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const color = accent || C.accent;

  useFrame((s) => {
    if ((!working && !selected) || reduced) return;
    const t = s.clock.elapsedTime;
    if (ring1.current && working) {
      const s1 = 1 + ((t * 1.4) % 1) * 0.45;
      ring1.current.scale.set(s1, s1, 1);
      (ring1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - ((t * 1.4) % 1)) * 0.6);
    }
    if (ring2.current && working) {
      const s2 = 1 + (((t * 1.4) + 0.5) % 1) * 0.45;
      ring2.current.scale.set(s2, s2, 1);
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - (((t * 1.4) + 0.5) % 1)) * 0.6);
    }
    s.invalidate();
  });

  return (
    <group position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* 기본 정적 림 */}
      <mesh>
        <ringGeometry args={[0.78, 0.84, 32]} />
        <meshBasicMaterial color={selected ? color : C.pedestalRim} opacity={selected ? 0.95 : 0.45} transparent />
      </mesh>

      {/* 동적 펄스 링 (작업 중일 때 팽창) */}
      {working && !reduced && (
        <>
          <mesh ref={ring1}>
            <ringGeometry args={[0.82, 0.88, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} />
          </mesh>
          <mesh ref={ring2}>
            <ringGeometry args={[0.82, 0.88, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} />
          </mesh>
        </>
      )}

      {/* 완료 상태 링 */}
      {done && (
        <mesh>
          <ringGeometry args={[0.84, 0.9, 32]} />
          <meshBasicMaterial color={color} opacity={0.75} transparent />
        </mesh>
      )}
    </group>
  );
};

// ---------- 전문가 자리 원형 단상 (Pedestal) ----------
const NodePedestal = ({
  x,
  z,
  working,
  done,
  selected,
  accent,
  reduced,
}: {
  x: number;
  z: number;
  working: boolean;
  done: boolean;
  selected: boolean;
  accent?: string;
  reduced: boolean;
}) => {
  return (
    <group position={[x, 0, z]}>
      {/* 원형 세라믹 단상 베이스 */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.8, 0.88, 0.08, 32]} />
        <meshLambertMaterial color={C.pedestal} />
      </mesh>

      {/* 중앙 받침 허브 */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.32, 0.42, 0.09, 24]} />
        <meshLambertMaterial color={C.pedestalRim} />
      </mesh>

      {/* 바닥 펄스 링 */}
      <NodeRings working={working} done={done} selected={selected} accent={accent} reduced={reduced} />

      {/* 선택 시 수직 앰비언트 빔 */}
      {selected && (
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.18, 0.32, 1.2, 24, 1, true]} />
          <meshBasicMaterial color={accent || C.accent} transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// ---------- 결과 전달 시그널 펄스 (비대면 전달 연출) ----------
interface SignalProps {
  from: [number, number];
  to: [number, number];
  active: boolean;
  onDone: () => void;
  accent?: string;
  reduced: boolean;
}

const SignalPulse = ({ from, to, active, onDone, accent, reduced }: SignalProps) => {
  const pulseRef = useRef<THREE.Group>(null!);
  const [progress, setProgress] = useState(0);
  const color = accent || C.accent;

  useFrame((s, dt) => {
    if (!active) return;
    if (reduced) {
      onDone();
      return;
    }
    const next = progress + dt * 1.25;
    if (next >= 1) {
      setProgress(0);
      onDone();
    } else {
      setProgress(next);
      if (pulseRef.current) {
        const x = THREE.MathUtils.lerp(from[0], to[0], next);
        const z = THREE.MathUtils.lerp(from[1], to[1], next);
        const arcY = Math.sin(next * Math.PI) * 0.45 + 0.2;
        pulseRef.current.position.set(x, arcY, z);
      }
      s.invalidate();
    }
  });

  if (!active || reduced) return null;

  return (
    <group ref={pulseRef} position={[from[0], 0.2, from[1]]}>
      <mesh>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} />
      </mesh>
    </group>
  );
};

// ---------- 총괄 코어 제단 (Gon Central Altar) ----------
const CoreNexus = ({ selected }: { selected: boolean }) => {
  return (
    <group>
      {/* 총괄 다층 원형 제단 베이스 */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 0.16, 32]} />
        <meshLambertMaterial color={C.pedestal} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.65, 0.85, 0.14, 28]} />
        <meshLambertMaterial color={C.pedestalRim} />
      </mesh>

      {/* 선택 시 수직 오라 빔 */}
      {selected && (
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.3, 0.55, 1.5, 28, 1, true]} />
          <meshBasicMaterial color={C.accent} transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// ---------- 렌더 갱신 헬퍼 ----------
const Invalidator = ({ dep }: { dep: string }) => {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [dep, invalidate]);
  return null;
};

// ---------- 씬 총괄 구성 ----------
const Scene = ({
  layout: L,
  gon,
  seats,
  workers,
  selectedId,
  reduced,
  onPhase,
}: Omit<SceneProps, 'camera' | 'fitKey'>) => {
  const [pulseActive, setPulseActive] = useState<Record<string, boolean>>({});
  const deliveredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    workers.forEach((w) => {
      if (w.deliverSlot !== undefined && !deliveredRef.current.has(w.id)) {
        deliveredRef.current.add(w.id);
        setPulseActive((prev) => ({ ...prev, [w.id]: true }));
        onPhase(w.id, 'out');
        setTimeout(() => onPhase(w.id, 'hand'), 400);
      }
    });
  }, [workers, onPhase]);

  const gonPos: [number, number] = [gon.x, gon.z];

  return (
    <>
      <ambientLight intensity={2.0} />
      <directionalLight position={[6, 14, 9]} intensity={2.0} />
      <NexusFloor L={L} gon={gon} />

      {/* 전문가 노드 단상 */}
      {Array.from({ length: seats }, (_, i) => {
        const w = workers[i];
        const [dx, dz] = L.desks[i];
        const isSelected = !!w && w.id === selectedId;
        const isDone = w ? w.screen === 'done' : false;
        const isWorking = w ? w.working : false;
        const accent = w ? w.accent : undefined;

        return (
          <group key={w ? w.id : `empty-${i}`}>
            <NodePedestal
              x={dx}
              z={dz}
              working={isWorking}
              done={isDone}
              selected={isSelected}
              accent={accent}
              reduced={reduced}
            />

            {w && (
              <SignalPulse
                from={[dx, dz]}
                to={gonPos}
                active={!!pulseActive[w.id]}
                onDone={() => {
                  setPulseActive((prev) => ({ ...prev, [w.id]: false }));
                  onPhase(w.id, 'seated');
                }}
                accent={accent}
                reduced={reduced}
              />
            )}
          </group>
        );
      })}

      {/* 중앙 총괄 코어 제단 */}
      {gon.patch && (
        <group position={[gon.x, 0, gon.z]}>
          <CoreNexus selected={selectedId === 'lead'} />
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
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <Invalidator dep={`${fitKey}:${theme}`} />
      <Scene {...rest} />
    </Canvas>
  );
};
