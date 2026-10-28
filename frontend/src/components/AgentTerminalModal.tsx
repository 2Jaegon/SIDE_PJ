import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DeskData } from './OfficeFloor';
import { Avatar } from './Avatar';

interface AgentTerminalModalProps {
  agent: DeskData | null;
  log?: string;
  onClose: () => void;
}

// 전문가 한 명의 역할 설명과 이번 작업 기록
export const AgentTerminalModal: React.FC<AgentTerminalModalProps> = ({ agent, log, onClose }) => {
  useEffect(() => {
    if (!agent) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agent, onClose]);

  if (!agent) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${agent.character_name} 작업 기록`}
        onClick={(e) => e.stopPropagation()}
        className="anim-rise w-full max-w-xl bg-surface border border-line rounded-t-xl sm:rounded flex flex-col max-h-[85vh]"
      >
        <div className="px-5 py-4 border-b border-line flex items-center gap-3">
          <Avatar accent={agent.accent} name={agent.character_name} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold truncate">{agent.character_name}</h2>
            <p className="text-xs text-sub truncate">{agent.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-2 -mr-2 rounded text-sub hover:text-ink hover:bg-sunken transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-5">
          <section>
            <h3 className="text-xs font-semibold text-sub mb-1.5">맡은 역할</h3>
            <p className="text-sm leading-6">{agent.description || '역할 설명이 아직 없습니다.'}</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-sub mb-1.5">이번 작업 기록</h3>
            {log ? (
              <pre className="text-[13px] leading-6 whitespace-pre-wrap font-sans bg-sunken rounded p-4">{log}</pre>
            ) : (
              <p className="text-sm text-faint bg-sunken rounded p-4">
                아직 작업 기록이 없어요. 일을 맡기면 이 전문가가 작업한 내용을 여기서 볼 수 있어요.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
