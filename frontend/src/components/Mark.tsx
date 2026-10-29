import React from 'react';

// 서비스 로고: 어두운 정사각 바탕에 왼쪽 끝이 비스듬히 잘린 흰색 `]` 모양.
// 첨부된 로고 이미지를 보고 다시 그린 것이라, 원본 파일이 생기면 이 파일만 바꾸면 된다.
export const Mark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none" aria-hidden className="shrink-0">
    <rect width="128" height="128" rx="26" fill="#111111" />
    <path d="M55 32H82V94H55L47 86V84H72V42H47V40Z" fill="#ffffff" />
  </svg>
);
