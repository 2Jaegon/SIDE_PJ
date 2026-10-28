import React from 'react';
import { Avatar } from './Avatar';

export interface FeedItem {
  id: string;
  character: string;
  accent: string;
  text: string;
}

// 작업 기록: 전문가별로 한 일을 한 줄씩 보여 준다.
export const ActivityFeed: React.FC<{ items: FeedItem[]; live: boolean }> = ({ items, live }) => {
  if (items.length === 0) return null;
  return (
    <section aria-label="작업 기록" aria-live="polite" className="rounded border border-line bg-surface">
      <div className="px-4 py-2.5 border-b border-line flex items-center gap-2 text-sm font-semibold">
        작업 기록
        {live && <span className="w-1.5 h-1.5 rounded-full bg-accent working-dot" />}
      </div>
      <ul className="divide-y divide-line max-h-64 overflow-y-auto">
        {items.map((it) => (
          <li key={it.id} className="anim-rise px-4 py-2.5 flex items-start gap-3">
            <Avatar accent={it.accent} name={it.character} size={24} />
            <p className="text-sm leading-6 min-w-0">
              <span className="font-semibold">{it.character}</span>
              <span className="text-sub"> · {it.text}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
