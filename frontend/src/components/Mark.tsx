import React from 'react';

export const Mark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden className="shrink-0">
    <rect width="28" height="28" rx="7" fill="#0b6b5c" />
    <path d="M6 18.5h16M9 18.5V12m10 6.5V12M6 12c3.5-5 12.5-5 16 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
