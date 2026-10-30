import * as THREE from 'three';

// 사무실 바닥의 월드 좌표(단위 약 1m). x는 오른쪽, z는 화면 앞쪽, y는 위.
// 왼쪽·가운데 바닥에는 전문가 책상이 놓이고, 오른쪽 옆(브리지로 연결된 총괄 구역)에는 총괄(Gon) 아바타 책상이 놓인다.
export type V2 = [number, number];

export const CELL_X = 3.2;
export const CELL_Z = 4.3;
const MIN_DEPTH = 4.2;
const SLOTS_PER_LINE = 4;
const SLOT_GAP = 0.72;
export const LANE_W = 1.4; // 사무실과 총괄 자리를 잇는 길의 너비

const GON_GAP = 1.2; // 전문가 바닥 오른쪽 끝에서 총괄 바닥 왼쪽 끝까지의 간격
const GON_W = 3.6;
const GON_D = 4.2;

export interface Layout {
  cols: number;
  rows: number;
  x0: number; // 전문가 바닥 왼쪽 끝
  z0: number; // 전문가 바닥 뒤쪽 끝
  width: number;
  depth: number;
  desks: V2[];
}

export const makeLayout = (count: number, cols: number): Layout => {
  const rows = Math.max(1, Math.ceil(count / cols));
  const width = cols * CELL_X;
  const depth = Math.max(rows * CELL_Z, MIN_DEPTH);
  const x0 = -width / 2;
  const z0 = -depth / 2;
  const desks: V2[] = Array.from({ length: count }, (_, i) => [
    x0 + ((i % cols) + 0.5) * CELL_X,
    z0 + Math.floor(i / cols) * CELL_Z + 1.7,
  ]);
  return { cols, rows, x0, z0, width, depth, desks };
};

// 총괄 자리: 책상 위치, 그 아래 깔리는 바닥 조각, 사무실 바닥에서 여기까지 이어지는 길(월드 좌표)
export interface Gon {
  x: number;
  z: number;
  patch: { cx: number; cz: number; w: number; d: number } | null;
  path: V2[]; // 전문가 사무실 바닥에서 총괄 자리 바닥까지 이어지는 통로 중심선
}

// 사무실 오른편에 총괄 전용 바닥과 책상을 배치한다
export const makeOfficeGon = (L: Layout): Gon => {
  const rightEdge = L.x0 + L.width;
  const frontEdge = L.z0 + L.depth;
  const cx = rightEdge + GON_GAP + GON_W / 2;
  const cz = frontEdge - GON_D / 2;
  const patch = { cx, cz, w: GON_W, d: GON_D };
  const x = cx;
  const z = cz + 0.55; // 총괄 책상 위치 (의자는 z + 1.05에 놓여 위쪽을 바라본다)
  const bridgeZ = z - 1.5; // 전문가들이 걸어와 서는 줄과 같은 높이로 브리지를 연결
  const path: V2[] = [
    [rightEdge, bridgeZ],
    [cx - GON_W / 2, bridgeZ],
  ];
  return { x, z, patch, path };
};

export const fallbackGon = (L: Layout): Gon => makeOfficeGon(L);

export const makeGon = (L: Layout, _x?: number, _z?: number, _patch?: NonNullable<Gon['patch']>): Gon => makeOfficeGon(L);

// 책상 뒤에 앉는 자리
export const seatOf = (L: Layout, i: number): V2 => [L.desks[i][0] - 0.5, L.desks[i][1] - 1.05];

// 결과를 건네는 자리: 총괄 책상 앞(위쪽)에 두 줄로 선다. 총괄은 책상 뒤(아래쪽)에서 위쪽을 보고 앉는다.
export const slotOf = (G: Gon, s: number): V2 => {
  const line = Math.floor((s % (SLOTS_PER_LINE * 2)) / SLOTS_PER_LINE);
  const k = s % SLOTS_PER_LINE;
  return [G.x - 1.1 + k * SLOT_GAP + line * SLOT_GAP * 0.35, G.z - 1.45 - line * 0.65];
};

// 총괄 자리에서 나오는 출발점
export const spawnOf = (G: Gon): V2 => [G.x, G.z - 1.2];

// 책상 뒤 자리에서 옆 통로로 나와 앞 복도를 따라 오른쪽 브리지로 건너가 총괄 책상 앞 목적지까지 가는 길
export const routeOf = (L: Layout, i: number, G: Gon, to: V2): V2[] => {
  const [dx, dz] = L.desks[i];
  const seat = seatOf(L, i);
  const gapX = dx + CELL_X / 2 - 0.25;
  const aisleZ = dz + 1.35;
  const rightCorridorX = L.x0 + L.width - 0.45;
  const bridgeZ = G.z - 1.45;
  const pts: V2[] = [
    seat,
    [gapX, seat[1]],
    [gapX, aisleZ],
    [rightCorridorX, aisleZ],
    [rightCorridorX, bridgeZ],
    to,
  ];
  return dedupe(pts);
};

const dedupe = (p: V2[]): V2[] => p.filter((q, k) => k === 0 || Math.hypot(q[0] - p[k - 1][0], q[1] - p[k - 1][1]) > 0.01);

// 꺾인 길을 따라 걷는 진행 상태
export class Track {
  pts: V2[] = [];
  d = 0;
  total = 0;

  set(pts: V2[]) {
    this.pts = pts;
    this.d = 0;
    this.total = pts.reduce((sum, q, k) => (k === 0 ? 0 : sum + Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1])), 0);
  }

  // 끝에 닿으면 true
  advance(step: number, instant: boolean): boolean {
    this.d = instant ? this.total : Math.min(this.total, this.d + step);
    return this.d >= this.total;
  }

  at(): { x: number; z: number; heading: number | null } {
    const p = this.pts;
    if (p.length === 0) return { x: 0, z: 0, heading: null };
    let left = this.d;
    for (let k = 1; k < p.length; k++) {
      const len = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
      if (left <= len || k === p.length - 1) {
        const t = len === 0 ? 1 : Math.min(left / len, 1);
        return {
          x: p[k - 1][0] + (p[k][0] - p[k - 1][0]) * t,
          z: p[k - 1][1] + (p[k][1] - p[k - 1][1]) * t,
          heading: len === 0 ? null : Math.atan2(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]),
        };
      }
      left -= len;
    }
    const last = p[p.length - 1];
    return { x: last[0], z: last[1], heading: null };
  }
}

// ---- 카메라: 정면에서 내려다보는 직교 시점. 기울기(elevation)만 조절한다 ----
export const TILT_MIN = 20;
export const TILT_MAX = 75;
export const TILT_DEFAULT = 40;
const MAX_ZOOM = 60;

export const makeCamera = () => {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  (cam as unknown as { manual: boolean }).manual = true;
  return cam;
};

// 전문가 사무실 바닥과 오른편 총괄 자리 바닥 전체가 stageH 높이의 사무실 영역에 꽉 차게 맞춘다.
export const fitCamera = (cam: THREE.OrthographicCamera, w: number, stageH: number, canvasH: number, L: Layout, tiltDeg: number) => {
  const el = (tiltDeg * Math.PI) / 180;
  cam.position.set(0, Math.sin(el) * 60, Math.cos(el) * 60);
  cam.lookAt(0, 0, 0);
  cam.zoom = 1;
  cam.left = -w / 2;
  cam.right = w / 2;
  cam.top = stageH / 2;
  cam.bottom = -stageH / 2;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);

  const x1 = L.x0 + L.width + GON_GAP + GON_W;
  const z1 = L.z0 + L.depth;
  const corners: [number, number, number][] = [
    [L.x0, -0.3, z1],
    [x1, -0.3, z1],
    [x1, -0.3, L.z0],
    [L.x0, -0.3, L.z0],
    [L.x0, 2.3, L.z0],
    [x1, 2.3, L.z0],
  ];
  const v = new THREE.Vector3();
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const c of corners) {
    v.set(...c).applyMatrix4(cam.matrixWorldInverse);
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }
  const zoom = Math.min(MAX_ZOOM, (w - 32) / (maxX - minX), (stageH - 28) / (maxY - minY));
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  cam.position.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2);
  cam.zoom = Math.max(zoom, 1);
  const cy = (stageH - canvasH) / (2 * cam.zoom);
  cam.top = cy + canvasH / 2;
  cam.bottom = cy - canvasH / 2;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
};

// 월드 좌표 -> 캔버스 안의 화면 좌표(px)
export const projectTo = (cam: THREE.OrthographicCamera, w: number, canvasH: number, p: [number, number, number]) => {
  const v = new THREE.Vector3(...p).project(cam);
  return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * canvasH };
};

// 캔버스 안의 화면 좌표(px) -> 바닥(y=0) 위의 월드 좌표
export const unprojectToGround = (cam: THREE.OrthographicCamera, w: number, canvasH: number, px: number, py: number): V2 => {
  const o = new THREE.Vector3((px / w) * 2 - 1, 1 - (py / canvasH) * 2, -1).unproject(cam);
  const d = new THREE.Vector3();
  cam.getWorldDirection(d);
  const t = -o.y / d.y;
  return [o.x + d.x * t, o.z + d.z * t];
};

// 캔버스 비율에 맞춰 책상 열 수를 고른다: 바닥이 가장 크게 보이는 쪽(같으면 열이 많은 쪽).
export const bestCols = (seats: number, w: number, stageH: number, tiltDeg: number) => {
  const max = Math.min(seats, 4);
  if (w < 2 || stageH < 2) return Math.min(max, 2);
  const cam = makeCamera();
  let best = 1;
  let bestZoom = 0;
  for (let c = 1; c <= max; c++) {
    fitCamera(cam, w, stageH, stageH, makeLayout(seats, c), tiltDeg);
    if (cam.zoom >= bestZoom * 0.995) {
      best = c;
      bestZoom = Math.max(bestZoom, cam.zoom);
    }
  }
  return best;
};
