import React from 'react';
import { Depth, Expert, Lens } from '../types';

export const DEPTHS: { id: Depth; label: string; hint: string }[] = [
  { id: 'fast', label: '빠르게', hint: '전문가 최대 4명' },
  { id: 'normal', label: '보통', hint: '전문가 최대 8명' },
  { id: 'deep', label: '깊게', hint: '전문가 최대 16명, 시간과 사용량이 늘어요' },
];

// 깊이: 한 요청에 부를 전문가 수의 상한. 실제 인원은 총괄이 요청 크기를 보고 그 안에서 정한다
export const DepthPicker: React.FC<{ value: Depth; onChange: (d: Depth) => void; caps?: Record<Depth, number>; disabled?: boolean }> = ({
  value,
  onChange,
  caps,
  disabled,
}) => (
  <div role="radiogroup" aria-label="작업 깊이" className="inline-flex h-8 shrink-0 items-center rounded-full bg-sunken p-0.5">
    {DEPTHS.map((d) => {
      const on = d.id === value;
      const hint = caps ? `전문가 최대 ${caps[d.id]}명${d.id === 'deep' ? ', 시간과 사용량이 늘어요' : ''}` : d.hint;
      return (
        <button
          key={d.id}
          type="button"
          role="radio"
          aria-checked={on}
          title={hint}
          disabled={disabled}
          onClick={() => onChange(d.id)}
          className={`h-7 rounded-full px-2.5 text-xs transition-colors duration-200 ease-out disabled:opacity-50 ${
            on ? 'bg-surface text-ink shadow-sm' : 'text-faint hover:text-ink'
          }`}
        >
          {d.label}
        </button>
      );
    })}
  </div>
);

const LENS_ORDER: { id: Lens; label: string }[] = [
  { id: 'service', label: '서비스 관점' },
  { id: 'dev', label: '개발자 관점' },
];

// 팀을 관점별로 묶는다. 관점이 없는 예전 결과는 '기타'로 둔다
export const groupByLens = (team: Expert[]): { label: string; members: Expert[] }[] => {
  const groups = LENS_ORDER.map((l) => ({ label: l.label, members: team.filter((x) => x.lens === l.id) }));
  const rest = team.filter((x) => !x.lens);
  return [...groups, { label: '기타', members: rest }].filter((g) => g.members.length > 0);
};

export const lensSummary = (team: Expert[]): string =>
  groupByLens(team)
    .map((g) => `${g.label} ${g.members.length}명`)
    .join(' · ');
