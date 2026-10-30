import { useEffect, useState } from 'react';

// OS의 "동작 줄이기" 설정. 처음 한 번만 읽지 않고, 사용 중에 바뀌어도 따라간다.
export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false));
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
};
