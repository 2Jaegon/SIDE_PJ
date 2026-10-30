import React from 'react';
import { getTheme, useTheme } from '../theme';

// 사람(에이전트)을 구분하는 옅은 색. 데이터 색이 아니라 정체성 표시이므로 채도를 낮게 유지한다.
type Tint = { bg: string; fg: string };
const LIGHT: Record<string, Tint> = {
  peach: { bg: '#fbe9dc', fg: '#86461a' },
  mint: { bg: '#dcf1e6', fg: '#1d6a43' },
  lavender: { bg: '#e9e5f5', fg: '#4a3d85' },
  rose: { bg: '#fae2e5', fg: '#94303f' },
  amber: { bg: '#f8eecb', fg: '#74560c' },
  _: { bg: '#e4eaf3', fg: '#2f4670' },
};
const DARK: Record<string, Tint> = {
  peach: { bg: '#3a2a1f', fg: '#f0c9a8' },
  mint: { bg: '#1f3329', fg: '#a9d9bd' },
  lavender: { bg: '#2c2840', fg: '#c9c0ec' },
  rose: { bg: '#3a2227', fg: '#efb5bf' },
  amber: { bg: '#37301a', fg: '#e8d291' },
  _: { bg: '#232a36', fg: '#b3c3e0' },
};

export const tintFor = (accent: string) => {
  const map = getTheme() === 'dark' ? DARK : LIGHT;
  return map[accent] ?? map._;
};

export const Avatar: React.FC<{ accent: string; name: string; size?: number }> = ({ accent, name, size = 36 }) => {
  useTheme(); // 테마가 바뀌면 다시 그린다
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
