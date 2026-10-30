import React from 'react';
import type { DeskData } from './OfficeFloor';
import type { LiveProgress } from './Orb';

interface GonPanelProps {
  desks?: DeskData[];
  workingAgentIds?: string[];
  failedAgentIds?: string[];
  activeAgentIds?: string[];
  isLoading?: boolean;
  finished?: boolean;
  stopped?: boolean;
  progress?: LiveProgress;
  planReason?: string;
  stageRef?: React.RefObject<HTMLDivElement>; // 3D 총괄 책상이 그려질 자리 창
  className?: string;
}

// 총괄 자리: 채팅 오른쪽 아래의 카드. 3D 총괄 책상과 아바타가 그려지며, 하단 텍스트 없이 일관된 비주얼을 유지한다.
export const GonPanel: React.FC<GonPanelProps> = ({
  stageRef,
  className = '',
}) => {
  return (
    <section
      aria-label="총괄 Gon"
      className={`flex flex-col min-h-0 h-full bg-ground rounded-none border-0 overflow-hidden ${className}`}
    >
      {/* 사무실의 3D 캔버스가 이 창까지 이어져 와서, 총괄 책상과 전문가가 걸어와 서는 자리를 그린다 */}
      <div ref={stageRef} aria-hidden className="flex-1 w-full h-full min-h-[132px] lg:min-h-[190px]" />
    </section>
  );
};
