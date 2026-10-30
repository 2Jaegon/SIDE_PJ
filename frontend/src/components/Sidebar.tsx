import React from 'react';
import { PanelLeftClose, Plus, LogOut, User as UserIcon, Trash2, Sun, Moon } from 'lucide-react';
import { setTheme, useTheme } from '../theme';
import { Mark } from './Mark';
import type { PoolSummary, Turn } from '../types';
import type { AuthUser } from '../auth';

interface SidebarProps {
  turns: Turn[];
  currentConv?: number;
  collapsed: boolean;
  onToggle: () => void;
  onNew: () => void;
  onJump: (turnId: number) => void;
  onClearHistory?: () => void;
  onDeleteConv?: (convId: number, query: string) => void;
  pool?: PoolSummary | null;
  user: AuthUser | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  turns,
  currentConv,
  collapsed,
  onToggle,
  onNew,
  onJump,
  onClearHistory,
  onDeleteConv,
  pool: _pool,
  user,
  onLogout,
}) => {
  const displayName = user?.name || user?.email?.split('@')[0] || '사용자';
  const userInitial = (displayName.charAt(0) || 'U').toUpperCase();
  const theme = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const themeLabel = theme === 'dark' ? '밝은 화면으로' : '어두운 화면으로';
  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <aside
      aria-label="사이드바"
      className={`shrink-0 flex items-center justify-between h-12 px-3 bg-sunken border-b border-line lg:h-full lg:px-0 lg:items-stretch lg:justify-start lg:flex-col lg:min-h-0 lg:rounded-none lg:border-r lg:border-line lg:border-y-0 lg:border-l-0 lg:overflow-hidden lg:transition-[width] lg:duration-200 lg:ease-out ${
        collapsed ? 'lg:w-14' : 'lg:w-[260px]'
      }`}
    >
      {/* 상단 브랜드 및 사이드바 접기/펼치기 — 로고(w-8 h-8)는 left:12px, top:12px에 상시 고정 */}
      <div className="flex items-center gap-2.5 lg:w-full lg:h-14 lg:px-3 lg:justify-between lg:shrink-0 lg:overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={collapsed ? onToggle : undefined}
            aria-label={collapsed ? '사이드바 펼치기' : 'Gon'}
            aria-expanded={!collapsed}
            title={collapsed ? '사이드바 펼치기' : undefined}
            className={`w-8 h-8 rounded-lg shrink-0 inline-flex items-center justify-center transition-colors duration-150 ease-out ${
              collapsed ? 'cursor-pointer hover:bg-raised' : 'cursor-default'
            }`}
          >
            <Mark size={28} />
          </button>
          <h1
            className={`font-semibold text-[16px] tracking-tight text-ink whitespace-nowrap transition-opacity duration-150 ease-out ${
              collapsed ? 'lg:opacity-0 lg:pointer-events-none' : 'lg:opacity-100'
            }`}
          >
            Gon
          </h1>
        </div>
        <button
          type="button"
          onClick={onToggle}
          tabIndex={collapsed ? -1 : 0}
          aria-label="사이드바 접기"
          aria-expanded={!collapsed}
          title="사이드바 접기"
          className={`hidden lg:inline-flex w-7 h-7 shrink-0 rounded-lg text-faint hover:text-ink hover:bg-raised items-center justify-center transition-opacity duration-150 ease-out ${
            collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <PanelLeftClose className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {/* 모바일 상단 바 */}
      <div className="lg:hidden flex items-center gap-1.5">
        <button
          type="button"
          onClick={onNew}
          className="h-8 px-2.5 rounded-lg hover:bg-raised text-sm font-medium text-ink inline-flex items-center gap-1.5 transition-colors duration-200 ease-out"
        >
          <span className="w-5 h-5 rounded-full bg-accent text-on-accent inline-flex items-center justify-center">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden />
          </span>
          새 채팅
        </button>
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          aria-label={themeLabel}
          title={themeLabel}
          className="h-8 w-8 rounded-lg text-sub hover:text-ink hover:bg-raised inline-flex items-center justify-center transition-colors duration-200 ease-out"
        >
          <ThemeIcon className="w-4 h-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onLogout}
          aria-label="로그아웃"
          title="로그아웃"
          className="h-8 w-8 rounded-lg text-sub hover:text-ink hover:bg-raised inline-flex items-center justify-center transition-colors duration-200 ease-out"
        >
          <LogOut className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {/* 데스크톱 새 채팅 버튼 — 원형 + 아이콘(w-8 h-8 박스 중심)도 left:12px에 상시 고정 */}
      <div className="hidden lg:flex items-center shrink-0 h-10 px-3 overflow-hidden">
        <button
          type="button"
          onClick={onNew}
          aria-label="새 채팅"
          title="새 채팅"
          className="w-full h-8 rounded-lg text-[14px] font-medium text-ink hover:bg-raised inline-flex items-center gap-2.5 overflow-hidden transition-colors duration-150 ease-out"
        >
          <span className="w-8 h-8 shrink-0 inline-flex items-center justify-center">
            <span className="w-5 h-5 rounded-full bg-accent text-on-accent inline-flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden />
            </span>
          </span>
          <span
            className={`whitespace-nowrap text-ink font-medium transition-opacity duration-150 ease-out ${
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            새 채팅
          </span>
        </button>
      </div>

      {/* 데스크톱 최근 항목 목록 — 접힐 때도 DOM 높이를 유지하고 투명도만 전환 */}
      <nav
        aria-label="최근 항목"
        aria-hidden={collapsed}
        className={`hidden lg:block flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar px-2.5 py-2 transition-opacity duration-150 ease-out ${
          collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="w-[238px]">
          <div className="flex items-center justify-between px-2 pt-2 pb-1.5 text-[11px] font-medium text-faint">
            <span>최근 항목</span>
            {onClearHistory && turns.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                tabIndex={collapsed ? -1 : 0}
                className="hover:text-danger text-faint transition-colors duration-150 text-[11px]"
                title="모든 채팅 삭제"
                aria-label="모든 채팅 삭제"
              >
                전체 삭제
              </button>
            )}
          </div>
          {turns.length === 0 ? (
            <p className="px-2 py-2 text-xs text-faint">최근 채팅이 없습니다</p>
          ) : (
            <ul className="space-y-0.5">
              {turns.map((t) => {
                const isActive = currentConv !== undefined && (t.conv ?? 0) === currentConv;
                const convId = t.conv ?? t.id;
                return (
                  <li key={t.id} className="group relative flex items-center">
                    <button
                      type="button"
                      tabIndex={collapsed ? -1 : 0}
                      onClick={() => onJump(t.id)}
                      className={`w-full h-8 px-2.5 pr-8 rounded-lg text-left text-[13.5px] inline-flex items-center transition-colors duration-150 ease-out ${
                        isActive
                          ? 'bg-raised text-ink font-medium'
                          : 'text-sub hover:text-ink hover:bg-raised/60'
                      }`}
                    >
                      <span className="truncate flex-1">{t.query || '새 채팅'}</span>
                    </button>
                    {onDeleteConv && (
                      <button
                        type="button"
                        tabIndex={collapsed ? -1 : 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConv(convId, t.query);
                        }}
                        aria-label="채팅 삭제"
                        title="채팅 삭제"
                        className="absolute right-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-faint hover:text-danger hover:bg-ground/60 transition-all duration-150"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      {/* 하단 사용자 프로필 및 테마/로그아웃 영역 — 프로필 아바타(w-8 h-8)는 left:12px, h-14 중앙에 상시 고정 */}
      <div className="hidden lg:flex shrink-0 h-14 px-3 border-t border-line items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-ink text-ground font-semibold text-xs flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : user ? (
              userInitial
            ) : (
              <UserIcon className="w-4 h-4 text-ground" />
            )}
          </div>
          <div
            className={`min-w-0 whitespace-nowrap transition-opacity duration-150 ease-out ${
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <p className="text-[13px] font-medium text-ink truncate leading-tight">{displayName}</p>
            <p className="text-[11px] text-faint truncate leading-tight">{user?.email}</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-0.5 shrink-0 transition-opacity duration-150 ease-out ${
            collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            tabIndex={collapsed ? -1 : 0}
            onClick={() => setTheme(nextTheme)}
            aria-label={themeLabel}
            title={themeLabel}
            className="w-7 h-7 rounded-md text-faint hover:text-ink hover:bg-raised inline-flex items-center justify-center transition-colors duration-150 ease-out"
          >
            <ThemeIcon className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button
            type="button"
            tabIndex={collapsed ? -1 : 0}
            onClick={onLogout}
            aria-label="로그아웃"
            title="로그아웃"
            className="w-7 h-7 rounded-md text-faint hover:text-ink hover:bg-raised inline-flex items-center justify-center transition-colors duration-150 ease-out shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
};
