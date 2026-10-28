import React from 'react';

// 사람(에이전트)을 구분하는 옅은 색. 데이터 색이 아니라 정체성 표시이므로 채도를 낮게 유지한다.
const TINTS: Record<string, { bg: string; fg: string }> = {
  peach: { bg: '#fbe9dc', fg: '#86461a' },
  mint: { bg: '#dcf1e6', fg: '#1d6a43' },
  lavender: { bg: '#e9e5f5', fg: '#4a3d85' },
  rose: { bg: '#fae2e5', fg: '#94303f' },
  amber: { bg: '#f8eecb', fg: '#74560c' },
};
const FALLBACK = { bg: '#e4eaf3', fg: '#2f4670' };

export const tintFor = (accent: string) => TINTS[accent] ?? FALLBACK;

export const Avatar: React.FC<{ accent: string; name: string; size?: number }> = ({ accent, name, size = 36 }) => {
  const t = tintFor(accent);
  return (
    <div
      aria-hidden
      className="rounded-full flex items-center justify-center font-semibold shrink-0 select-none"
      style={{ width: size, height: size, background: t.bg, color: t.fg, fontSize: size * 0.4 }}
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </div>
  );
};
