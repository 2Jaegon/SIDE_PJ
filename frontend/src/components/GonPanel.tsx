import React from 'react';
import { Check } from 'lucide-react';
import { Mark } from './Mark';
import { Orb, LiveProgress } from './Orb';
import type { DeskData } from './OfficeFloor';

interface GonPanelProps {
  desks: DeskData[];
  workingAgentIds: string[];
  failedAgentIds: string[];
  activeAgentIds: string[];
  isLoading: boolean;
  finished: boolean; // 결과를 사용자에게 전달했는지
  stopped: boolean; // 멈추거나 실패해서 끝났는지
  progress: LiveProgress;
  planReason: string;
  className?: string;
}

type MemberState = 'failed' | 'working' | 'done' | 'reported' | 'idle';

const MEMBER_LABEL: Record<MemberState, string> = {
  failed: '실패',
  working: '작업 중',
  done: '완료',
  reported: '보고 완료',
  idle: '대기',
};

// 총괄 자리: 요청을 분석하고, 전문가를 배치하고, 결과를 사용자에게 전달하는 흐름을 보여 준다.
export const GonPanel: React.FC<GonPanelProps> = ({
  desks,
  workingAgentIds,
  failedAgentIds,
  activeAgentIds,
  isLoading,
  finished,
  stopped,
  progress,
  planReason,
  className = '',
}) => {
  const team = desks.filter((d) => d.id !== 'lead');
  const stateOf = (id: string): MemberState => {
    if (failedAgentIds.includes(id)) return 'failed';
    if (workingAgentIds.includes(id)) return 'working';
    if (activeAgentIds.includes(id)) return finished ? 'done' : 'reported';
    return 'idle';
  };
  const idle = !isLoading && !finished && !stopped && team.length === 0;

  return (
    // 모바일에서는 일하는 동안과 끝난 뒤에만 보인다. 대기 중에는 사무실에 자리를 내준다.
    <section aria-label="총괄 Gon" className={`flex flex-col min-h-0 h-full rounded-lg border border-line bg-surface ${idle ? 'max-lg:hidden' : ''} ${className}`}>
      <header className="shrink-0 h-9 px-3 flex items-center gap-2 border-b border-line">
        <Mark size={18} />
        <h2 className="text-sm font-semibold text-ink">총괄 Gon</h2>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-3">
        {idle && <p className="text-sm text-sub">요청을 분석해 전문가를 배치하고, 결과를 모아 전달해요.</p>}

        {isLoading && <Orb progress={progress} />}

        {finished && (
          <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
            <Check className="w-4 h-4" aria-hidden />
            결과를 전달했어요
          </p>
        )}
        {stopped && !finished && <p className="text-sm text-sub">작업이 끝나지 않았어요. 대화에서 이유를 확인해 주세요.</p>}

        {/* 모바일에서는 사무실의 책상이 같은 정보를 보여 주므로 데스크톱에서만 적는다 */}
        {planReason && <p className="max-lg:hidden text-sm leading-6 text-sub">{planReason}</p>}

        {team.length > 0 && (
          <ul aria-label="배치된 전문가" className="max-lg:hidden space-y-1.5">
            {team.map((d) => {
              const s = stateOf(d.id);
              return (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      s === 'failed' ? 'bg-danger' : s === 'working' ? 'working-dot bg-accent' : s === 'idle' ? 'bg-line' : 'bg-accent'
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-ink">{d.character_name}</span>
                  <span className={`shrink-0 text-xs ${s === 'failed' ? 'text-danger' : 'text-faint'}`}>{MEMBER_LABEL[s]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
