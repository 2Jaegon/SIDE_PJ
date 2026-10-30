import React from 'react';
import { ThinkingOrb, OrbState } from 'thinking-orbs';

export type Phase = 'connect' | 'plan' | 'work' | 'synth';

export interface LiveProgress {
  phase: Phase;
  total: number; // 편성된 전문가 수
  done: number; // 결과를 낸 전문가 수
}

const phaseToOrbState = (phase: Phase): OrbState => {
  switch (phase) {
    case 'connect':
      return 'connecting';
    case 'plan':
      return 'searching';
    case 'work':
      return 'working';
    case 'synth':
      return 'weaving';
  }
};

const label = (p: LiveProgress) => {
  switch (p.phase) {
    case 'connect':
      return '요청을 받았어요';
    case 'plan':
      return '필요한 전문가를 고르는 중';
    case 'work':
      return `전문가 ${p.total - p.done}명 작업 중${p.done > 0 ? ` · ${p.done}명 보고 완료` : ''}`;
    case 'synth':
      return '결과를 하나로 합치는 중';
  }
};

export interface OrbProps {
  progress?: LiveProgress;
  state?: OrbState;
  size?: 64 | 32 | 20;
  dark?: boolean;
  speed?: number;
  className?: string;
}

// 작업 표시 오브. thinking-orbs 공식 라이브러리를 채택하여 단계별 수작업 애니메이션 상태를 렌더링한다.
export const Orb: React.FC<OrbProps> = ({
  progress,
  state: stateProp,
  size = 64,
  dark = true,
  speed = 1,
  className = '',
}) => {
  const orbState: OrbState = stateProp || (progress ? phaseToOrbState(progress.phase) : 'breathing');

  if (!progress) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <ThinkingOrb state={orbState} size={size} dark={dark} speed={speed} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3.5 ${className}`} role="status" aria-live="polite">
      <div className="relative shrink-0 flex items-center justify-center" aria-hidden>
        <ThinkingOrb state={orbState} size={size} dark={dark} speed={progress.phase === 'synth' ? 1.3 : speed} />
      </div>
      <p className="text-sm text-ink">{label(progress)}</p>
    </div>
  );
};
