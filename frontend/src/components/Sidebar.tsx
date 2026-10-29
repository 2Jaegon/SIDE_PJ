import React from 'react';
import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { Mark } from './Mark';
import type { PoolSummary, Turn } from '../types';

interface SidebarProps {
  turns: Turn[];
  collapsed: boolean;
  onToggle: () => void;
  onNew: () => void;
  onJump: (turnId: number) => void;
  pool: PoolSummary | null;
}

const turnDot = (t: Turn) => (t.error ? 'bg-danger' : t.done ? 'bg-faint' : 'working-dot bg-accent');

// 데스크톱에서는 왼쪽 열(로고와 접기 버튼, 이번 대화의 요청 목록, 서비스 상태),
// 모바일에서는 위쪽 바(로고, 새 대화)로 바뀐다. h1은 하나뿐이라 어느 화면에서나 보인다.
export const Sidebar: React.FC<SidebarProps> = ({ turns, collapsed, onToggle, onNew, onJump, pool }) => {
  const status = !pool
    ? { dot: 'bg-danger', title: '서버 응답 없음', sub: 'gon run으로 서비스를 켜 주세요' }
    : pool.mode === 'stub'
      ? { dot: 'bg-faint', title: 'AI 미연결', sub: `전문가 ${pool.total}명 · 시험용 결과` }
      : { dot: 'bg-accent', title: 'AI 연결됨', sub: `전문가 ${pool.total}명` };

  return (
    <aside
      aria-label="사이드바"
      className={`shrink-0 flex items-center justify-between h-12 px-4 bg-surface border-b border-line lg:h-auto lg:px-0 lg:items-stretch lg:justify-start lg:flex-col lg:min-h-0 lg:rounded-lg lg:border lg:transition-[width] lg:duration-200 lg:ease-out ${
        collapsed ? 'lg:w-16' : 'lg:w-72'
      }`}
    >
      <div className={`flex items-center gap-2.5 lg:shrink-0 ${collapsed ? 'lg:flex-col lg:gap-2 lg:py-3' : 'lg:w-full lg:justify-between lg:h-14 lg:px-3'}`}>
        <div className="flex items-center gap-2.5">
          <Mark size={collapsed ? 32 : 28} />
          <h1 className={collapsed ? 'font-bold tracking-tight lg:sr-only' : 'font-bold tracking-tight'}>Gon</h1>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-expanded={!collapsed}
          className="hidden lg:inline-flex w-8 h-8 rounded text-faint hover:text-ink hover:bg-ground items-center justify-center transition-colors duration-200 ease-out"
        >
          {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" aria-hidden /> : <PanelLeftClose className="w-[18px] h-[18px]" aria-hidden />}
        </button>
      </div>

      {/* 모바일 위쪽 바의 오른쪽 */}
      <div className="lg:hidden flex items-center gap-3">
        {pool?.mode === 'stub' && <span className="text-sm text-faint">AI 미연결</span>}
        {turns.length > 0 && (
          <button
            type="button"
            onClick={onNew}
            className="h-8 px-2.5 rounded border border-line bg-surface text-sm text-ink hover:border-faint inline-flex items-center gap-1.5 transition-colors duration-200 ease-out"
          >
            <Plus className="w-4 h-4" aria-hidden />
            새 대화
          </button>
        )}
      </div>

      <div className={`hidden lg:flex shrink-0 ${collapsed ? 'justify-center pb-2' : 'px-3 pb-2'}`}>
        <button
          type="button"
          onClick={onNew}
          disabled={turns.length === 0}
          aria-label="새 대화"
          className={`h-9 rounded border border-line bg-surface text-sm text-ink inline-flex items-center justify-center gap-1.5 hover:border-faint disabled:text-faint disabled:hover:border-line transition-colors duration-200 ease-out ${
            collapsed ? 'w-9' : 'w-full'
          }`}
        >
          <Plus className="w-4 h-4" aria-hidden />
          {!collapsed && '새 대화'}
        </button>
      </div>

      <nav aria-label="요청 목록" className="hidden lg:block flex-1 min-h-0 overflow-y-auto no-scrollbar px-2 pb-2">
        {!collapsed &&
          (turns.length === 0 ? (
            <p className="px-2 py-2 text-sm text-faint">아직 요청이 없어요</p>
          ) : (
            <ul className="space-y-0.5">
              {turns.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onJump(t.id)}
                    className="w-full min-h-9 px-2 py-1.5 rounded text-left text-sm text-ink hover:bg-ground inline-flex items-start gap-2 transition-colors duration-200 ease-out"
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${turnDot(t)}`} aria-hidden />
                    <span className="line-clamp-2 break-words">{t.query}</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </nav>

      <div className={`hidden lg:flex shrink-0 border-t border-line items-center ${collapsed ? 'justify-center py-3' : 'gap-3 p-3'}`} role="status">
        <span className="w-10 h-10 rounded-full border border-line bg-ground inline-flex items-center justify-center shrink-0" aria-hidden>
          <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
        </span>
        {collapsed ? (
          <span className="sr-only">
            {status.title}, {status.sub}
          </span>
        ) : (
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{status.title}</p>
            <p className="text-xs text-faint truncate">{status.sub}</p>
          </div>
        )}
      </div>
    </aside>
  );
};
