import React from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { AgentFigure } from './AgentFigure';

export interface DeskData {
  id: string;
  name: string;
  role_korean: string;
  character_name: string;
  badge_label: string;
  accent: string;
  desk_coord: { x: number; y: number };
  desk_index?: number;
  description: string;
  skills?: string[];
  mcp_servers?: string[];
}

interface OfficeFloorProps {
  desks: DeskData[];
  activeAgentIds: string[];
  workingAgentIds: string[];
  failedAgentIds?: string[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onOpenRosterSlot?: (slotIndex: number) => void;
}

// 투입된 전문가들이 자기 자리에서 일하는 모습. 좌표 배치 대신 반응형 격자를 쓴다.
export const OfficeFloor: React.FC<OfficeFloorProps> = ({
  desks,
  activeAgentIds,
  workingAgentIds,
  failedAgentIds = [],
  selectedAgentId,
  onSelectAgent,
  onOpenRosterSlot,
}) => {
  if (desks.length === 0) {
    return (
      <div className="rounded border border-dashed border-line bg-surface px-5 py-8 text-center text-sm text-sub">
        투입된 전문가가 없어요. 오른쪽 위 <b className="font-semibold text-ink">전문가 교체</b>에서 팀을 꾸려 보세요.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {desks.map((desk, idx) => {
        const isWorking = workingAgentIds.includes(desk.id);
        const isFailed = failedAgentIds.includes(desk.id);
        const isDone = !isWorking && !isFailed && activeAgentIds.includes(desk.id);
        const isSelected = selectedAgentId === desk.id;
        const state = isWorking ? 'working' : isDone ? 'done' : 'idle';

        return (
          <li key={desk.id} className="relative">
            <button
              type="button"
              onClick={() => onSelectAgent(desk.id)}
              aria-label={`${desk.character_name} 작업 기록 열기`}
              className={`w-full h-full text-left rounded bg-surface border p-3 lg:p-4 flex items-center gap-3 lg:flex-col lg:items-stretch lg:gap-2 transition-colors duration-200 ease-out ${
                isSelected ? 'border-ink' : isWorking ? 'border-accent' : 'border-line hover:border-faint'
              }`}
            >
              <AgentFigure accent={desk.accent} state={state} className="w-20 shrink-0 lg:w-full lg:max-w-[150px] lg:mx-auto" />

              <div className="min-w-0 flex-1 lg:flex-none">
                <div className="text-sm font-semibold truncate">{desk.character_name}</div>
                <div className="text-xs text-sub leading-4 truncate lg:whitespace-normal lg:line-clamp-2 lg:min-h-[2rem]">
                  {desk.name}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs shrink-0 mr-8 lg:mr-0">
                {isWorking ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent working-dot" />
                    <span className="text-accent font-medium">작업 중</span>
                  </>
                ) : isDone ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-accent" aria-hidden />
                    <span className="text-accent font-medium">완료</span>
                  </>
                ) : isFailed ? (
                  <span className="text-danger font-medium">작업 실패</span>
                ) : (
                  <span className="text-faint">대기 중</span>
                )}
              </div>
            </button>

            {onOpenRosterSlot && (
              <button
                type="button"
                onClick={() => onOpenRosterSlot(idx)}
                title="이 자리의 전문가 교체"
                aria-label={`${desk.character_name} 교체`}
                className="absolute top-1/2 -translate-y-1/2 right-2.5 lg:translate-y-0 lg:top-2.5 p-1.5 rounded text-faint hover:text-ink hover:bg-sunken transition-colors duration-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};
