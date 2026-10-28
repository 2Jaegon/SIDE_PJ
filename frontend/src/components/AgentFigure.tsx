import React from 'react';
import { tintFor } from './Avatar';

export type FigureState = 'idle' | 'working' | 'done';

// 자리에 앉은 에이전트 한 명. 상태는 요청의 실제 진행(대기 → 처리 중 → 완료)을 그대로 보여 준다.
export const AgentFigure: React.FC<{ accent: string; state: FigureState; className?: string }> = ({
  accent,
  state,
  className,
}) => {
  const t = tintFor(accent);
  const working = state === 'working';
  const lineFill = working ? '#0b6b5c' : '#d6d5cf';

  return (
    <svg viewBox="0 0 120 84" className={className} role="img" aria-hidden fill="none">
      {/* 책상 */}
      <rect x="8" y="58" width="104" height="8" rx="3" fill="#e0e0dc" />
      <rect x="18" y="66" width="4" height="14" rx="1" fill="#d2d1cb" />
      <rect x="98" y="66" width="4" height="14" rx="1" fill="#d2d1cb" />

      {/* 모니터 */}
      <rect x="52" y="22" width="48" height="32" rx="4" fill="#fff" stroke="#c9c8c2" />
      <rect x="73" y="54" width="6" height="4" fill="#c9c8c2" />
      {state === 'done' ? (
        <path d="M66 38l6 6 12-13" stroke="#0b6b5c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <rect x="59" y="29" width="34" height="3.5" rx="1.75" fill={lineFill} className={working ? 'type-line' : ''} style={{ animationDelay: '0s' }} />
          <rect x="59" y="37" width="26" height="3.5" rx="1.75" fill={lineFill} className={working ? 'type-line' : ''} style={{ animationDelay: '0.35s' }} />
          <rect x="59" y="45" width="30" height="3.5" rx="1.75" fill={lineFill} className={working ? 'type-line' : ''} style={{ animationDelay: '0.7s' }} />
        </>
      )}

      {/* 사람 */}
      <g className={working ? 'fig-bob' : ''}>
        <rect x="14" y="40" width="30" height="22" rx="11" fill={t.bg} stroke={t.fg} strokeWidth="1.5" />
        <circle cx="29" cy="28" r="10" fill={t.bg} stroke={t.fg} strokeWidth="1.5" />
        {/* 시선: 일하는 중에는 모니터 쪽 */}
        <circle cx={working ? 32 : 29} cy="28" r="1.6" fill={t.fg} />
        <circle cx={working ? 36 : 33} cy="28" r="1.6" fill={t.fg} />
      </g>

      {/* 말풍선: 처리 중 점 세 개 */}
      {working && (
        <g>
          <rect x="18" y="4" width="26" height="12" rx="6" fill="#fff" stroke="#c9c8c2" />
          <circle cx="25" cy="10" r="1.6" fill="#0b6b5c" className="dot-pulse" style={{ animationDelay: '0s' }} />
          <circle cx="31" cy="10" r="1.6" fill="#0b6b5c" className="dot-pulse" style={{ animationDelay: '0.2s' }} />
          <circle cx="37" cy="10" r="1.6" fill="#0b6b5c" className="dot-pulse" style={{ animationDelay: '0.4s' }} />
        </g>
      )}
    </svg>
  );
};
