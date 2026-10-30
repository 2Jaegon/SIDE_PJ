import React, { useEffect } from 'react';

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  subMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

interface ConfirmModalProps {
  state: ConfirmModalState | null;
  onClose: () => void;
}

// claude.ai 확인 모달과 동일한 레이아웃·타이포그래피·버튼 스타일
export const ConfirmModal: React.FC<ConfirmModalProps> = ({ state, onClose }) => {
  useEffect(() => {
    if (!state?.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state?.isOpen, onClose]);

  if (!state || !state.isOpen) return null;

  const {
    title,
    message,
    subMessage,
    confirmLabel = '삭제',
    cancelLabel = '취소',
    isDestructive = true,
    onConfirm,
  } = state;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 anim-rise"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl bg-surface border border-line p-6 shadow-xl text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="text-[17px] font-semibold text-ink tracking-tight">
          {title}
        </h3>
        <p className="mt-2 text-sm text-sub leading-relaxed whitespace-pre-line">
          {message}
        </p>
        {subMessage && (
          <p className="mt-1.5 text-xs text-faint leading-relaxed">
            {subMessage}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-sm font-medium text-ink bg-transparent hover:bg-raised border border-line transition-colors duration-200 ease-out"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`h-9 px-4 rounded-lg text-sm font-medium text-white transition-opacity duration-200 ease-out ${
              isDestructive
                ? 'bg-danger hover:opacity-90'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
