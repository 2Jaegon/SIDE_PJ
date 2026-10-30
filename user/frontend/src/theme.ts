import { useSyncExternalStore } from 'react';

// 화면 테마. 색 토큰은 index.css의 :root / [data-theme='dark']에 있고, 여기서는 html의 data-theme만 바꾼다.
export type Theme = 'light' | 'dark';

const KEY = 'gon.theme';
const listeners = new Set<() => void>();

const read = (): Theme => {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

let current: Theme = read();
document.documentElement.dataset.theme = current;

export const getTheme = () => current;

export const setTheme = (t: Theme) => {
  current = t;
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // 저장이 막힌 브라우저에서도 이번 화면에는 적용된다
  }
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useTheme = () => useSyncExternalStore(subscribe, getTheme);
