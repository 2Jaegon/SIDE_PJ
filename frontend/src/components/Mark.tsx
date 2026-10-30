import React from 'react';
import logoUrl from '../assets/logo.webp';

interface MarkProps {
  size?: number;
  className?: string;
}

export const Mark: React.FC<MarkProps> = ({ size = 28, className = '' }) => (
  <img
    src={logoUrl}
    alt="Gon Logo"
    width={size}
    height={size}
    className={`shrink-0 rounded-lg object-contain select-none ${className}`}
    style={{ width: `${size}px`, height: `${size}px` }}
    draggable={false}
  />
);
