import React, { useState, useMemo } from 'react';
import {
  Layers,
  Cpu,
  Eye,
  ShieldCheck,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { Avatar } from './Avatar';

export type FeedStage =
  | 'plan'
  | 'agent'
  | 'review'
  | 'qa'
  | 'revise'
  | 'synthesis'
  | 'skill_gap'
  | 'direct'
  | 'start'
  | 'general';

export interface FeedItem {
  id: string;
  character: string;
  accent: string;
  text: string;
  stage?: FeedStage;
  timestamp?: string;
  status?: 'running' | 'done' | 'failed' | 'info';
}

interface ActivityFeedProps {
  items: FeedItem[];
  isLoading?: boolean;
}

// 아이템 ID와 텍스트 내용으로부터 파이프라인 단계 및 상태 메타데이터 추출
function resolveStage(item: FeedItem): {
  stage: FeedStage;
  label: string;
  chipClass: string;
  icon: React.ComponentType<{ className?: string }>;
  isError: boolean;
  isRevised: boolean;
} {
  const text = item.text || '';
  const id = item.id || '';
  const isError = text.includes('실패') || text.includes('오류') || text.includes('error') || id.includes('err');
  const isRevised = text.includes('수정') || id.includes('revise');

  // 1) 명시적 stage가 있는 경우
  if (item.stage) {
    switch (item.stage) {
      case 'plan':
      case 'start':
        return {
          stage: 'plan',
          label: '편성',
          chipClass: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
          icon: Layers,
          isError,
          isRevised,
        };
      case 'agent':
        return {
          stage: 'agent',
          label: '작업',
          chipClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          icon: Cpu,
          isError,
          isRevised,
        };
      case 'review':
        return {
          stage: 'review',
          label: '검토',
          chipClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
          icon: Eye,
          isError,
          isRevised,
        };
      case 'qa':
      case 'revise':
        return {
          stage: 'qa',
          label: isRevised ? 'QA 수정' : 'QA 검증',
          chipClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
          icon: ShieldCheck,
          isError,
          isRevised,
        };
      case 'synthesis':
        return {
          stage: 'synthesis',
          label: '종합',
          chipClass: 'text-accent bg-accent-soft border-accent/30',
          icon: Sparkles,
          isError,
          isRevised,
        };
      default:
        break;
    }
  }

  // 2) item.id 파싱 (App.tsx의 `${d.id}-${key}-${t.feed.length}`)
  if (id.includes('-plan-') || id.includes('-start-')) {
    return {
      stage: 'plan',
      label: '편성',
      chipClass: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
      icon: Layers,
      isError,
      isRevised,
    };
  }
  if (id.includes('-task-') || id.includes('-end-') || id.includes('-agent-')) {
    return {
      stage: 'agent',
      label: '작업',
      chipClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: Cpu,
      isError,
      isRevised,
    };
  }
  if (id.includes('-review-') || id.includes('-review-end-')) {
    return {
      stage: 'review',
      label: '검토',
      chipClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: Eye,
      isError,
      isRevised,
    };
  }
  if (id.includes('-qa-') || id.includes('-revise-')) {
    return {
      stage: 'qa',
      label: isRevised ? 'QA 수정' : 'QA 검증',
      chipClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
      icon: ShieldCheck,
      isError,
      isRevised,
    };
  }
  if (id.includes('-synth-') || id.includes('-synthesis-')) {
    return {
      stage: 'synthesis',
      label: '종합',
      chipClass: 'text-accent bg-accent-soft border-accent/30',
      icon: Sparkles,
      isError,
      isRevised,
    };
  }

  // 3) 텍스트 키워드 기반 유추
  if (text.includes('전문가를 고르고') || text.includes('책상에 앉혔어요') || text.includes('팀 편성')) {
    return {
      stage: 'plan',
      label: '편성',
      chipClass: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
      icon: Layers,
      isError,
      isRevised,
    };
  }
  if (text.includes('합치고 있어요') || text.includes('결과를 하나로')) {
    return {
      stage: 'synthesis',
      label: '종합',
      chipClass: 'text-accent bg-accent-soft border-accent/30',
      icon: Sparkles,
      isError,
      isRevised,
    };
  }
  if (text.includes('QA') || text.includes('수정') || text.includes('재확인')) {
    return {
      stage: 'qa',
      label: isRevised ? 'QA 수정' : 'QA 검증',
      chipClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
      icon: ShieldCheck,
      isError,
      isRevised,
    };
  }
  if (text.includes('평가') || text.includes('검토')) {
    return {
      stage: 'review',
      label: '검토',
      chipClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: Eye,
      isError,
      isRevised,
    };
  }
  if (text.includes('맡은 일') || text.includes('작업') || text.includes('분석')) {
    return {
      stage: 'agent',
      label: '작업',
      chipClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: Cpu,
      isError,
      isRevised,
    };
  }

  // 기본 상태
  return {
    stage: 'general',
    label: '진행',
    chipClass: 'text-sub bg-sunken border-line',
    icon: Activity,
    isError,
    isRevised,
  };
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items, isLoading = false }) => {
  const [filter, setFilter] = useState<string>('all');

  // 각 아이템별 stage 정보 미리 매핑
  const resolvedItems = useMemo(() => {
    return items.map((item) => ({
      item,
      info: resolveStage(item),
    }));
  }, [items]);

  // 필터링된 아이템 리스트
  const filtered = useMemo(() => {
    if (filter === 'all') return resolvedItems;
    return resolvedItems.filter(({ info }) => info.stage === filter);
  }, [resolvedItems, filter]);

  // 빈 상태 (Empty State)
  if (items.length === 0 && !isLoading) {
    return (
      <div className="py-6 px-4 rounded-lg border border-dashed border-line bg-surface/40 text-center space-y-2 select-none anim-rise">
        <div className="w-8 h-8 mx-auto rounded-full bg-sunken flex items-center justify-center text-faint">
          <Activity className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-ink">아직 진행된 작업이 없습니다</p>
          <p className="text-[11px] text-faint max-w-sm mx-auto leading-relaxed">
            요청을 보내면 전문가 편성부터 개별 분석, QA 검증, 최종 종합까지의 실시간 파이프라인이 여기에 기록됩니다.
          </p>
        </div>
      </div>
    );
  }

  // 로딩 스켈레톤 (진행 시작 직후 첫 아이템 대기 중일 때)
  if (items.length === 0 && isLoading) {
    return (
      <div className="space-y-3 py-2 anim-rise select-none" aria-label="진행 기록 로딩 중">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2.5 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-line shrink-0" />
            <div className="w-12 h-4 rounded bg-line/80 shrink-0" />
            <div
              className="h-4 rounded bg-line/60 flex-1"
              style={{ width: n === 1 ? '70%' : n === 2 ? '85%' : '60%' }}
            />
          </div>
        ))}
      </div>
    );
  }

  // 필터 탭 옵션들 (아이템이 4개 이상일 때만 노출)
  const showFilters = items.length >= 4;

  return (
    <div className="space-y-2.5">
      {/* 스테이지 필터 칩 바 (목록이 길어질 때 탐색 용이) */}
      {showFilters && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5 text-[11px] select-none scrollbar-none">
          <div className="flex items-center gap-1 text-faint mr-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>단계:</span>
          </div>

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded-full border transition-all ${
              filter === 'all'
                ? 'bg-ink text-surface border-ink font-semibold'
                : 'bg-surface text-sub border-line hover:text-ink hover:border-faint'
            }`}
          >
            전체 ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('plan')}
            className={`px-2 py-0.5 rounded-full border transition-all ${
              filter === 'plan'
                ? 'bg-sky-500 text-white border-sky-500 font-semibold'
                : 'bg-surface text-sub border-line hover:text-ink hover:border-faint'
            }`}
          >
            편성
          </button>

          <button
            type="button"
            onClick={() => setFilter('agent')}
            className={`px-2 py-0.5 rounded-full border transition-all ${
              filter === 'agent'
                ? 'bg-emerald-500 text-white border-emerald-500 font-semibold'
                : 'bg-surface text-sub border-line hover:text-ink hover:border-faint'
            }`}
          >
            작업
          </button>

          <button
            type="button"
            onClick={() => setFilter('qa')}
            className={`px-2 py-0.5 rounded-full border transition-all ${
              filter === 'qa'
                ? 'bg-purple-500 text-white border-purple-500 font-semibold'
                : 'bg-surface text-sub border-line hover:text-ink hover:border-faint'
            }`}
          >
            QA
          </button>

          <button
            type="button"
            onClick={() => setFilter('synthesis')}
            className={`px-2 py-0.5 rounded-full border transition-all ${
              filter === 'synthesis'
                ? 'bg-accent text-on-accent border-accent font-semibold'
                : 'bg-surface text-sub border-line hover:text-ink hover:border-faint'
            }`}
          >
            종합
          </button>
        </div>
      )}

      {/* 활동 피드 리스트 */}
      <ul aria-live="polite" className="space-y-2">
        {filtered.map(({ item, info }, idx) => {
          const IconComp = info.icon;
          const isLatest = idx === filtered.length - 1;

          return (
            <li
              key={item.id}
              className="anim-rise flex items-start gap-2.5 p-1 -mx-1 rounded-md hover:bg-sunken/40 transition-colors duration-150 group"
            >
              {/* 캐릭터 아바타 */}
              <div className="shrink-0 pt-0.5">
                <Avatar accent={item.accent} name={item.character} size={22} />
              </div>

              {/* 본문 및 칩 영역 */}
              <div className="min-w-0 flex-1 text-sm leading-6">
                <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                  <span className="font-semibold text-ink text-[13px]">{item.character}</span>

                  {/* 단계별 시각적 뱃지 칩 */}
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border leading-normal ${info.chipClass}`}
                  >
                    <IconComp className="w-2.5 h-2.5 shrink-0" />
                    <span>{info.label}</span>
                  </span>

                  {/* 에러 상태 칩 */}
                  {info.isError && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-danger-soft text-danger border border-danger/30 leading-normal">
                      <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                      실패
                    </span>
                  )}

                  {/* QA 수정본 칩 */}
                  {info.isRevised && !info.isError && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 leading-normal">
                      <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      수정 반영
                    </span>
                  )}

                  {/* 최신 아이템 실행 중 인디케이터 */}
                  {isLatest && isLoading && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent working-dot" />
                      진행 중
                    </span>
                  )}
                </div>

                {/* 텍스트 내용 */}
                <p className="text-sub text-[13px] leading-5 break-words font-sans">
                  {item.text}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* 추가 로딩 인디케이터 (아이템이 이미 있고 계속 작업이 진행 중일 때) */}
      {isLoading && items.length > 0 && (
        <div className="flex items-center gap-2 pt-1 text-xs text-sub animate-pulse select-none">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>다음 파이프라인 단계 진행 중...</span>
        </div>
      )}
    </div>
  );
};
