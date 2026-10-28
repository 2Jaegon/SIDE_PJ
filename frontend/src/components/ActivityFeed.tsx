import React from 'react';
import { Avatar } from './Avatar';

export interface FeedItem {
  id: string;
  character: string;
  accent: string;
  text: string;
}

// 진행 기록: 전문가별로 한 일을 한 줄씩 보여 준다.
export const ActivityFeed: React.FC<{ items: FeedItem[] }> = ({ items }) => (
  <ul aria-live="polite" className="space-y-2">
    {items.map((it) => (
      <li key={it.id} className="anim-rise flex items-start gap-2.5">
        <Avatar accent={it.accent} name={it.character} size={22} />
        <p className="text-sm leading-6 min-w-0">
          <span className="font-semibold">{it.character}</span>
          <span className="text-sub"> · {it.text}</span>
        </p>
      </li>
    ))}
  </ul>
);
