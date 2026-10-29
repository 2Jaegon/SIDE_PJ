import React, { useEffect, useRef } from 'react';
import { ArrowUp, Square, X, AlertCircle } from 'lucide-react';
import { ActivityFeed } from './ActivityFeed';
import { ExportActionBar } from './ExportActionBar';
import { PromptRecipeCard } from './PromptRecipeCard';
import { Avatar } from './Avatar';
import { Mark } from './Mark';
import type { ExpertItem } from './RosterDrawer';
import { Turn, toDesk } from '../types';

interface ChatPanelProps {
  turns: Turn[];
  isLoading: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  customTeam: ExpertItem[];
  onRemoveMember: (id: string) => void;
  onClearTeam: () => void;
  onToggleCard: (turnId: number) => void;
}

const TurnView: React.FC<{ turn: Turn; onToggleCard: () => void }> = ({ turn, onToggleCard }) => {
  const r = turn.result;
  const team = r ? r.experts.map((x, i) => toDesk(x, i + 1)) : [];
  return (
    <div id={`turn-${turn.id}`} className="space-y-3 scroll-mt-4">
      <div className="flex justify-end">
        <p className="max-w-[88%] rounded-lg bg-accent text-white px-3.5 py-2.5 text-base leading-6 whitespace-pre-wrap">{turn.query}</p>
      </div>

      <div className="flex gap-2.5">
        <Mark size={24} />
        <div className="min-w-0 flex-1 space-y-3">

          {turn.feed.length > 0 &&
            (turn.done ? (
              <details className="group">
                <summary className="text-sm text-faint cursor-pointer select-none hover:text-ink transition-colors duration-200 ease-out">
                  진행 기록 {turn.feed.length}단계
                </summary>
                <div className="mt-2">
                  <ActivityFeed items={turn.feed} />
                </div>
              </details>
            ) : (
              <ActivityFeed items={turn.feed} />
            ))}

          {turn.error && (
            <div role="alert" className="flex items-start gap-2 rounded border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              <span>{turn.error}</span>
            </div>
          )}

          {r && (
            <div className="space-y-3 anim-rise">
              {r.mode === 'stub' && <p className="rounded bg-sunken px-3 py-2 text-sm text-sub">AI가 연결되지 않아 시험용 결과예요.</p>}
              <article className="rounded-lg border border-line bg-surface p-4 text-[15px] leading-7 text-ink whitespace-pre-wrap">
                {r.final_content}
              </article>
              <ExportActionBar
                query={r.query}
                content={r.final_content}
                team={team}
                promptCoachTip={r.prompt_coach_tip}
                showRecipeCard={turn.card}
                onToggleRecipeCard={onToggleCard}
              />
              {turn.card && <PromptRecipeCard query={r.query} team={team} promptCoachTip={r.prompt_coach_tip} />}

              <details className="rounded-lg border border-line bg-surface">
                <summary className="px-4 py-3 text-sm font-medium cursor-pointer select-none hover:bg-ground rounded-lg transition-colors duration-200 ease-out">
                  전문가별 작업 기록 {r.experts.length}명
                </summary>
                <div className="divide-y divide-line border-t border-line">
                  {r.experts.map((x) => {
                    const entry = r.agent_logs[x.id];
                    const failed = entry?.status === 'failed';
                    return (
                      <article key={x.id} className="p-4">
                        <header className="flex items-center gap-2.5 mb-1.5">
                          <Avatar accent={x.accent} name={x.name} size={26} />
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold">{x.name}</h3>
                            <p className="text-sm text-sub">{x.task}</p>
                          </div>
                        </header>
                        <p className={`text-sm leading-6 whitespace-pre-wrap ${failed ? 'text-danger' : 'text-sub'}`}>
                          {failed ? `작업 실패: ${entry?.log}` : entry?.log}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </details>

              <aside className="rounded-lg border border-accent/25 bg-accent-soft p-4">
                <h3 className="text-sm font-semibold text-accent">다음엔 이렇게 물어보세요</h3>
                <p className="mt-1 text-sm leading-6 text-ink">{r.prompt_coach_tip}</p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 대화 내용: 요청과 Gon의 진행 기록·결과가 쌓인다
export const ChatThread: React.FC<Pick<ChatPanelProps, 'turns' | 'onToggleCard'>> = ({ turns, onToggleCard }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const feedLen = turns.length ? turns[turns.length - 1].feed.length : 0;
  const lastDone = turns.length ? turns[turns.length - 1].done : false;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns.length, feedLen, lastDone]);

  return (
    <div className="no-scrollbar h-full min-h-0 overflow-y-auto bg-surface px-4 py-5 space-y-8">
      {turns.map((t) => (
        <TurnView key={t.id} turn={t} onToggleCard={() => onToggleCard(t.id)} />
      ))}
      <div ref={endRef} />
    </div>
  );
};

// 입력창: 항상 화면 아래에 있다
export const Composer: React.FC<
  Pick<ChatPanelProps, 'isLoading' | 'draft' | 'onDraft' | 'onSend' | 'onStop' | 'customTeam' | 'onRemoveMember' | 'onClearTeam'>
> = ({ isLoading, draft, onDraft, onSend, onStop, customTeam, onRemoveMember, onClearTeam }) => {
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const send = () => {
    if (draft.trim() && !isLoading) onSend();
  };

  return (
    <div className="bg-surface">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-line p-3 space-y-2.5"
      >
        {customTeam.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {customTeam.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full border border-line bg-ground text-sm text-ink">
                {c.name}
                <button
                  type="button"
                  onClick={() => onRemoveMember(c.id)}
                  aria-label={`${c.name} 빼기`}
                  className="w-5 h-5 rounded-full inline-flex items-center justify-center text-faint hover:text-danger"
                >
                  <X className="w-3.5 h-3.5" aria-hidden />
                </button>
              </span>
            ))}
            <button type="button" onClick={onClearTeam} className="text-sm text-faint hover:text-ink underline underline-offset-2 ml-1">
              Gon이 고르게
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={areaRef}
            rows={1}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            aria-label="요청"
            placeholder="무엇을 맡길까요?"
            className="no-scrollbar flex-1 min-h-[44px] resize-none rounded border border-line bg-surface px-3 py-2.5 text-base leading-6 text-ink placeholder:text-faint focus:outline-none focus:border-accent transition-colors duration-200 ease-out"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="멈추기"
              className="h-11 w-11 shrink-0 rounded border border-line bg-surface text-ink inline-flex items-center justify-center hover:border-faint transition-colors duration-200 ease-out"
            >
              <Square className="w-4 h-4 fill-current" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="보내기"
              className="h-11 w-11 shrink-0 rounded bg-accent text-white inline-flex items-center justify-center hover:bg-accent-hover disabled:bg-sunken disabled:text-faint transition-colors duration-200 ease-out"
            >
              <ArrowUp className="w-5 h-5" aria-hidden />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
