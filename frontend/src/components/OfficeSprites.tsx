import React, { useEffect, useRef, useState } from 'react';
import { tintFor } from './Avatar';

// 바닥 위 좌표: 가로는 바닥 폭의 %와 px 보정, 세로는 px.
export interface Spot {
  xPct: number;
  dx: number;
  y: number;
}

export const WALK_MS = 1000;

export const spotStyle = (s: Spot) => ({ left: `calc(${s.xPct}% + ${s.dx}px)`, top: `${s.y}px` });

interface PersonProps {
  accent: string;
  spot: Spot;
  entrance?: Spot; // 있으면 이 자리에서 걸어 들어온다
  delay?: number;
  seated: boolean;
  working: boolean;
  badge?: 'done' | 'failed' | null;
}

// 걸어 다니는 사람 한 명. 위치가 바뀌면 CSS 전환으로 실제로 걸어가고, 그동안 다리가 번갈아 움직인다.
export const Person: React.FC<PersonProps> = ({ accent, spot, entrance, delay = 0, seated, working, badge }) => {
  const t = tintFor(accent);
  const [placed, setPlaced] = useState(!entrance);
  const [walking, setWalking] = useState(false);
  const lastKey = useRef('');
  const key = `${spot.xPct}|${spot.dx}|${spot.y}`;

  useEffect(() => {
    if (placed) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setPlaced(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [placed]);

  useEffect(() => {
    if (!placed) return;
    if (lastKey.current && lastKey.current !== key) {
      setWalking(true);
      const id = window.setTimeout(() => setWalking(false), WALK_MS + delay);
      lastKey.current = key;
      return () => window.clearTimeout(id);
    }
    if (!lastKey.current) {
      lastKey.current = key;
      // 입구에서 들어오는 첫 이동도 걷는 동작으로 보인다
      if (entrance) {
        setWalking(true);
        const id = window.setTimeout(() => setWalking(false), WALK_MS + delay);
        return () => window.clearTimeout(id);
      }
    }
  }, [key, placed]);

  const at = placed ? spot : entrance!;
  const showSeated = seated && !walking;

  return (
    <div
      aria-hidden
      className="absolute pointer-events-none"
      style={{
        ...spotStyle(at),
        transform: 'translate(-50%, -100%)',
        transition: `left ${WALK_MS}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms, top ${WALK_MS}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
        zIndex: showSeated ? 5 : 20,
      }}
    >
      <svg viewBox="0 0 44 64" width="44" height="64" fill="none" className={walking ? 'walk-bob' : ''}>
        {!showSeated && (
          <g>
            <rect x="14" y="44" width="6" height="16" rx="3" fill={t.fg} className={walking ? 'leg-a' : ''} />
            <rect x="24" y="44" width="6" height="16" rx="3" fill={t.fg} className={walking ? 'leg-b' : ''} />
          </g>
        )}
        <rect x="9" y="24" width="26" height="26" rx="11" fill={t.bg} stroke={t.fg} strokeWidth="1.5" />
        {/* 손: 일하는 중에는 번갈아 두드린다 */}
        <circle cx="13" cy="46" r="3" fill={t.fg} className={working && showSeated ? 'hand-a' : ''} />
        <circle cx="31" cy="46" r="3" fill={t.fg} className={working && showSeated ? 'hand-b' : ''} />
        <circle cx="22" cy="15" r="11" fill={t.bg} stroke={t.fg} strokeWidth="1.5" />
        <circle cx="18.5" cy="15" r="1.6" fill={t.fg} />
        <circle cx="25.5" cy="15" r="1.6" fill={t.fg} />
      </svg>

      {working && showSeated && (
        <svg viewBox="0 0 34 14" width="34" height="14" className="absolute -top-3 left-1/2 -translate-x-1/2" fill="none">
          <rect x="0.5" y="0.5" width="33" height="13" rx="6.5" fill="#fff" stroke="#c9c8c2" />
          <circle cx="10" cy="7" r="1.8" fill="#0b6b5c" className="dot-pulse" style={{ animationDelay: '0s' }} />
          <circle cx="17" cy="7" r="1.8" fill="#0b6b5c" className="dot-pulse" style={{ animationDelay: '0.2s' }} />
          <circle cx="24" cy="7" r="1.8" fill="#0b6b5c" className="dot-pulse" style={{ animationDelay: '0.4s' }} />
        </svg>
      )}
      {badge && !walking && (
        <span
          className={`absolute -top-2 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
            badge === 'done' ? 'bg-accent' : 'bg-danger'
          }`}
        >
          {badge === 'done' ? '✓' : '×'}
        </span>
      )}
    </div>
  );
};

export type DeskScreen = 'off' | 'working' | 'done';

// 책상과 모니터. 사람은 이 뒤에 앉는다(사람이 아래층, 책상이 위층).
export const DeskFurniture: React.FC<{ screen: DeskScreen }> = ({ screen }) => (
  <svg viewBox="0 0 120 48" width="120" height="48" fill="none" aria-hidden>
    <rect x="12" y="30" width="4" height="16" rx="1" fill="#d2d1cb" />
    <rect x="104" y="30" width="4" height="16" rx="1" fill="#d2d1cb" />
    <rect x="4" y="22" width="112" height="9" rx="3" fill="#e0e0dc" />
    <rect x="66" y="0" width="42" height="24" rx="4" fill="#fff" stroke="#c9c8c2" />
    <rect x="84" y="22" width="6" height="3" fill="#c9c8c2" />
    {screen === 'done' ? (
      <path d="M79 12l5 5 10-10" stroke="#0b6b5c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      [5, 11, 17].map((y, i) => (
        <rect
          key={y}
          x="72"
          y={y}
          width={[30, 22, 26][i]}
          height="3"
          rx="1.5"
          fill={screen === 'working' ? '#0b6b5c' : '#d6d5cf'}
          className={screen === 'working' ? 'type-line' : ''}
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))
    )}
  </svg>
);
