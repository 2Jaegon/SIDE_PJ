import React from 'react';

export type Phase = 'connect' | 'plan' | 'work' | 'synth';

export interface LiveProgress {
  phase: Phase;
  total: number; // 편성된 전문가 수
  done: number; // 결과를 낸 전문가 수
}

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

// 작업 표시 오브. 단계에 따라 숨 쉬는 속도가 달라지고, 일하는 전문가 수만큼 궤도 점이 돈다.
export const Orb: React.FC<{ progress: LiveProgress }> = ({ progress }) => {
  const { phase, total, done } = progress;
  const working = phase === 'work' ? Math.max(total - done, 0) : 0;
  const speed = phase === 'work' ? '1.6s' : phase === 'synth' ? '1.1s' : '2.6s';

  return (
    <div className="flex items-center gap-3.5" role="status" aria-live="polite">
      <div className="orb relative w-14 h-14 shrink-0" style={{ ['--orb-speed' as string]: speed }} aria-hidden>
        <span className="orb-ring absolute inset-0 rounded-full border border-accent/40" />
        <span className="orb-ring orb-ring-2 absolute inset-0 rounded-full border border-accent/30" />
        <span className="orb-core absolute inset-2.5 rounded-full" />
        {working > 0 && (
          <span className="orb-orbit absolute inset-0">
            {Array.from({ length: Math.min(working, 8) }, (_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-accent"
                style={{ transform: `rotate(${(360 / Math.min(working, 8)) * i}deg) translateY(-26px)` }}
              />
            ))}
          </span>
        )}
      </div>
      <p className="text-sm text-ink">{label(progress)}</p>
    </div>
  );
};
