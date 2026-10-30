import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square, X, AlertCircle, Plus, Copy, Check, Pencil, RotateCcw, ChevronRight, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { ActivityFeed } from './ActivityFeed';
import { ExportActionBar } from './ExportActionBar';
import { Markdown } from './Markdown';
import { PromptRecipeCard } from './PromptRecipeCard';
import { Avatar } from './Avatar';
import { Mark } from './Mark';
import type { ExpertItem } from './RosterDrawer';
import { Depth, LlmInfo, Turn, toDesk } from '../types';
import { DepthPicker, groupByLens } from './TeamControls';
import { ACCEPT, Attachment, MAX_ATTACHMENTS } from '../attachments';

// 대화 화면: claude.ai와 동일한 타이포그래피·여백·입력창 구조.
// 가운데 정렬된 본문 폭, 오른쪽 사용자 메시지 버블, 말풍선 없는 AI 응답 본문,
// 응답 위 접히는 '사고/작업 과정' 아코디언, 하단 플로팅 입력 카드.

const COL = 'mx-auto w-full max-w-3xl';

const iconBtn =
  'h-7 w-7 rounded-md inline-flex items-center justify-center text-faint hover:text-ink hover:bg-raised transition-colors duration-150 ease-out';

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={iconBtn}
      aria-label={done ? '복사됨' : label}
      title={done ? '복사됨' : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* 클립보드 권한이 없으면 조용히 넘어간다 */
        }
      }}
    >
      {done ? <Check className="w-3.5 h-3.5 text-accent" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
    </button>
  );
};

interface TurnProps {
  turn: Turn;
  isLast: boolean;
  busy: boolean;
  onToggleCard: () => void;
  onRegenerate: () => void;
  onEdit: (text: string) => void;
}

const UserMessage: React.FC<Pick<TurnProps, 'turn' | 'isLast' | 'busy' | 'onEdit'>> = ({ turn, isLast, busy, onEdit }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(turn.query);

  if (editing) {
    return (
      <form
        className="ml-auto w-full max-w-[85%] rounded-2xl border border-line bg-surface p-3.5 shadow-xs"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setEditing(false);
          onEdit(text.trim());
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="질문 수정"
          rows={3}
          autoFocus
          className="w-full resize-none bg-transparent text-[15px] leading-7 text-ink focus:outline-none"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-8 px-3 rounded-lg border border-line text-xs font-medium text-ink hover:bg-raised transition-colors duration-150 ease-out"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!text.trim()}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-accent text-on-accent hover:bg-accent-hover disabled:opacity-40 transition-colors duration-150 ease-out"
          >
            저장 및 제출
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group flex flex-col items-end gap-1">
      {turn.images.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1.5 max-w-[85%]">
          {turn.images.map((src, i) => (
            <img key={i} src={src} alt={`첨부 이미지 ${i + 1}`} className="h-24 w-24 rounded-xl object-cover border border-line" />
          ))}
        </div>
      )}
      {turn.query && (
        <div className="max-w-[85%] rounded-2xl bg-sunken px-4 py-2.5 text-[15px] leading-7 text-ink whitespace-pre-wrap break-words">
          {turn.query}
        </div>
      )}
      {turn.query && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 ease-out">
          <CopyButton text={turn.query} label="메시지 복사" />
          {isLast && !busy && (
            <button type="button" className={iconBtn} aria-label="메시지 수정" title="메시지 수정" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// 전문가 팀이 한 일: claude.ai의 '사고 과정(Thinking)' 블록 스타일과 동일하게 접히고 펼쳐진다
const WorkProcess: React.FC<{ turn: Turn }> = ({ turn }) => {
  const r = turn.result;
  const experts = r?.experts ?? [];
  const working = !turn.done;
  const lastLine = turn.feed[turn.feed.length - 1];
  const [open, setOpen] = useState(false);
  const expanded = open || (working && !turn.answer);
  const summary = working
    ? expanded || !lastLine
      ? '생각 및 분석 중...'
      : `${lastLine.character} · ${lastLine.text}`
    : `사고 및 작업 과정 · 전문가 ${experts.length}명`;

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className="inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-xs font-medium text-sub hover:text-ink hover:bg-sunken transition-colors duration-150 ease-out"
      >
        {working && <span className="working-dot w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />}
        <span className="truncate">{summary}</span>
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-out ${expanded ? 'rotate-90' : ''}`} aria-hidden />
      </button>
      {expanded && (
        <div className="mt-2 ml-1 pl-3.5 border-l-2 border-line space-y-3 anim-rise">
          {r?.intent && <p className="text-xs text-sub">파악한 의도: {r.intent}</p>}
          {r?.sub_questions && r.sub_questions.length > 0 && (
            <ol className="list-decimal pl-4 text-xs text-sub space-y-0.5">
              {r.sub_questions.map((q, i) => (
                <li key={i}>{q.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          )}
          {turn.feed.length > 0 && <ActivityFeed items={turn.feed} />}
          {experts.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer select-none text-faint hover:text-ink transition-colors duration-150 ease-out">
                전문가별 상세 분석 보기
              </summary>
              <div className="mt-2 space-y-4">
                {groupByLens(experts).map((g) => (
                  <section key={g.label} className="space-y-3">
                    <h3 className="text-[11px] font-semibold text-faint">
                      {g.label} · {g.members.length}명
                    </h3>
                    {g.members.map((x) => {
                      const entry = r?.agent_logs[x.id];
                      const failed = entry?.status === 'failed';
                      return (
                        <article key={x.id}>
                          <header className="flex items-center gap-2 mb-1">
                            <Avatar accent={x.accent} name={x.name} size={20} />
                            <h3 className="font-semibold text-ink">{x.name}</h3>
                            <span className="text-faint truncate">{x.sub_question || x.task}</span>
                          </header>
                          {failed ? (
                            <p className="text-danger">작업 실패: {entry?.log}</p>
                          ) : (
                            <Markdown content={entry?.log || ''} className="!text-xs !leading-6 text-sub" />
                          )}
                        </article>
                      );
                    })}
                  </section>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

const TurnView: React.FC<TurnProps> = ({ turn, isLast, busy, onToggleCard, onRegenerate, onEdit }) => {
  const r = turn.result;
  const team = r ? r.experts.map((x, i) => toDesk(x, i + 1)) : [];
  const answer = r?.final_content ?? turn.answer ?? '';
  const streaming = !turn.done && !!turn.answer;
  const route = r?.route ?? turn.route;
  const showProcess = route !== 'direct' && (turn.feed.length > 0 || (r?.experts.length ?? 0) > 0);

  return (
    <div id={`turn-${turn.id}`} className="space-y-5 scroll-mt-4">
      <UserMessage turn={turn} isLast={isLast} busy={busy} onEdit={onEdit} />

      <div className="flex gap-3.5">
        <Mark size={24} className="mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          {showProcess && <WorkProcess turn={turn} />}

          {!turn.done && !answer && route === 'direct' && (
            <p className="text-sm text-faint inline-flex items-center gap-1.5">
              <span className="working-dot w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
              응답 작성 중...
            </p>
          )}

          {r?.mode === 'stub' && (
            <p className="mb-3 rounded-lg bg-sunken px-3 py-2 text-xs text-sub">AI가 연결되지 않아 시험용 결과로 표시됩니다.</p>
          )}

          {answer && (
            <div className="report-viewer" aria-live={streaming ? 'polite' : undefined} aria-busy={streaming}>
              <Markdown content={answer} />
              {streaming && <span className="inline-block w-2 h-4 -mb-0.5 bg-accent working-dot" aria-hidden />}
            </div>
          )}

          {turn.error && (
            <div
              role="alert"
              className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
              <span className="flex-1">{turn.error}</span>
              {isLast && !busy && (
                <button type="button" onClick={onRegenerate} className="inline-flex items-center gap-1 font-medium hover:underline">
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                  다시 시도
                </button>
              )}
            </div>
          )}

          {r && (
            <div className="mt-2.5 space-y-2.5">
              <ExportActionBar
                query={r.query}
                content={r.final_content}
                team={team}
                promptCoachTip={r.prompt_coach_tip}
                showRecipeCard={turn.card}
                onToggleRecipeCard={onToggleCard}
                onRegenerate={isLast && !busy ? onRegenerate : undefined}
                subQuestions={r.sub_questions}
                intent={r.intent}
              />
              {turn.card && <PromptRecipeCard query={r.query} team={team} promptCoachTip={r.prompt_coach_tip} />}
              {r.prompt_coach_tip && (
                <p className="text-xs text-faint">
                  <span className="text-sub font-medium">프롬프트 팁 · </span>
                  {r.prompt_coach_tip}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ChatThreadProps {
  turns: Turn[];
  llm: LlmInfo | null;
  busy: boolean;
  onToggleCard: (turnId: number) => void;
  onRegenerate: (turnId: number) => void;
  onEdit: (turnId: number, text: string) => void;
}

// 대화 내용: 비어 있으면 claude.ai 스타일의 첫 인사 화면을 보여 준다.
export const ChatThread: React.FC<ChatThreadProps> = ({ turns, llm, busy, onToggleCard, onRegenerate, onEdit }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const last = turns[turns.length - 1];
  const tick = last ? `${turns.length}:${last.feed.length}:${(last.answer ?? '').length}:${last.done}` : '';

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [tick]);

  if (turns.length === 0) {
    return (
      <div className="h-full min-h-0 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
        <div className="flex items-center gap-2.5">
          <Mark size={32} />
          <h2 className="text-2xl font-medium tracking-tight text-ink">오늘 어떤 도움을 드릴까요?</h2>
        </div>
        {llm?.fallback && (
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
            {llm.fallback.from} 사용 한도 도달 · 서브 AI({llm.label})로 자동 전환됨
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="no-scrollbar h-full min-h-0 overflow-y-auto">
      <div className={`${COL} px-4 py-6 space-y-8`}>
        {turns.map((t, i) => (
          <TurnView
            key={t.id}
            turn={t}
            isLast={i === turns.length - 1}
            busy={busy}
            onToggleCard={() => onToggleCard(t.id)}
            onRegenerate={() => onRegenerate(t.id)}
            onEdit={(text) => onEdit(t.id, text)}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

interface ComposerProps {
  isLoading: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  customTeam: ExpertItem[];
  onRemoveMember: (id: string) => void;
  onClearTeam: () => void;
  images: Attachment[];
  notice: string;
  onFiles: (files: File[]) => void;
  onRemoveImage: (id: string) => void;
  llm: LlmInfo | null;
  model: string;
  onModel: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  depth?: Depth;
  depthCaps?: Record<Depth, number>;
  onDepth?: (d: Depth) => void;
}

// 모델 고르기: claude.ai 입력창 하단 모델 셀렉터 스타일
const ModelPicker: React.FC<{ llm: LlmInfo | null; model: string; onModel: (id: string) => void; disabled: boolean }> = ({
  llm,
  model,
  onModel,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const list = llm?.models ?? [];
  const current = list.find((m) => m.id === model) ?? list[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (list.length === 0) {
    return (
      <span className="min-w-0 truncate text-xs font-medium text-sub inline-flex items-center gap-1.5" title="연결된 AI">
        <span>{llm?.label}</span>
        {llm?.fallback && (
          <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
            {llm.fallback.from} 한도 소진 → 서브 전환
          </span>
        )}
      </span>
    );
  }

  return (
    <div ref={boxRef} className="relative min-w-0 inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`모델 고르기, 지금: ${current?.label}`}
        title={disabled ? '답을 받는 동안에는 바꿀 수 없어요' : '모델 고르기'}
        className="inline-flex h-7 max-w-full items-center gap-1 rounded-lg px-2 text-xs font-medium text-sub hover:bg-sunken hover:text-ink disabled:opacity-50 disabled:hover:bg-transparent transition-colors duration-150 ease-out"
      >
        <span className="truncate">
          {llm?.label} · {current?.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {llm?.fallback && (
        <span
          className="hidden sm:inline-flex items-center rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent shrink-0"
          title={`${llm.fallback.from} 사용 한도에 도달해 서브 AI(${llm.label})로 자동 전환되었습니다.`}
        >
          {llm.fallback.from} 한도 소진 → 서브 전환
        </span>
      )}
      {open && (
        <ul
          role="listbox"
          aria-label="모델"
          className="absolute bottom-full left-0 z-20 mb-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl anim-rise"
        >
          {list.map((m) => {
            const selected = m.id === current?.id;
            return (
              <li key={m.id || 'default'} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onModel(m.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-sunken transition-colors duration-150 ease-out ${
                    selected ? 'bg-sunken' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-ink">{m.label}</span>
                    {m.note && <span className="block text-[11px] text-faint mt-0.5">{m.note}</span>}
                  </span>
                  {selected && <Check className="mt-0.5 w-3.5 h-3.5 shrink-0 text-accent" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// 입력창: claude.ai 플로팅 입력 카드 디자인
export const Composer: React.FC<ComposerProps> = ({
  isLoading,
  draft,
  onDraft,
  onSend,
  onStop,
  customTeam,
  onRemoveMember,
  onClearTeam,
  images,
  notice,
  onFiles,
  onRemoveImage,
  llm,
  model,
  onModel,
  isExpanded = false,
  onToggleExpand,
  depth,
  depthCaps,
  onDepth,
}) => {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const canSend = (draft.trim() !== '' || images.length > 0) && !isLoading;
  const canSeeImages = llm?.images ?? false;
  const attachTitle = !canSeeImages
    ? `${llm?.label ?? '연결된 AI'}는 이미지를 볼 수 없어요`
    : images.length >= MAX_ATTACHMENTS
      ? `이미지는 ${MAX_ATTACHMENTS}장까지 첨부할 수 있어요`
      : '파일 및 이미지 첨부';

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  const send = () => {
    if (canSend) onSend();
  };

  const imagesIn = (list: FileList | DataTransferItemList | null): File[] =>
    Array.from<File | DataTransferItem>(list ?? [])
      .map((x) => (x instanceof File ? x : x.kind === 'file' ? x.getAsFile() : null))
      .filter((f): f is File => !!f && f.type.startsWith('image/'));

  const aiName = llm?.label || 'Claude';

  return (
    <div className="px-3 pb-2.5 pt-1 bg-ground">
      <div className={COL}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          onDragOver={(e) => {
            if (canSeeImages && Array.from(e.dataTransfer.types).includes('Files')) {
              e.preventDefault();
              setDragging(true);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const files = imagesIn(e.dataTransfer.files);
            if (files.length > 0) onFiles(files);
          }}
          className={`rounded-2xl border bg-surface px-3.5 pt-3 pb-2.5 shadow-xs transition-colors duration-150 ease-out focus-within:border-faint/70 ${
            dragging ? 'border-accent bg-accent-soft' : 'border-line'
          }`}
        >
          {images.length > 0 && (
            <ul aria-label="첨부한 이미지" className="flex flex-wrap gap-2 pb-2.5">
              {images.map((img, i) => (
                <li key={img.id} className="relative">
                  <img src={img.url} alt={`첨부 이미지 ${i + 1}`} className="h-14 w-14 rounded-lg object-cover border border-line" />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(img.id)}
                    aria-label={`첨부 이미지 ${i + 1} 빼기`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-ground inline-flex items-center justify-center hover:bg-danger transition-colors duration-150 ease-out"
                  >
                    <X className="w-3 h-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {customTeam.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              {customTeam.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1 rounded-md bg-sunken text-xs font-medium text-ink">
                  {c.name}
                  <button
                    type="button"
                    onClick={() => onRemoveMember(c.id)}
                    aria-label={`${c.name} 빼기`}
                    className="w-4 h-4 rounded inline-flex items-center justify-center text-faint hover:text-danger"
                  >
                    <X className="w-3 h-3" aria-hidden />
                  </button>
                </span>
              ))}
              <button type="button" onClick={onClearTeam} className="text-xs text-faint hover:text-ink underline underline-offset-2 ml-1">
                자동 편성으로 전환
              </button>
            </div>
          )}

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
            onPaste={(e) => {
              const files = imagesIn(e.clipboardData.items);
              if (files.length > 0 && canSeeImages) {
                e.preventDefault();
                onFiles(files);
              }
            }}
            aria-label="메시지"
            placeholder={`${aiName}에게 답장하기...`}
            className="no-scrollbar block w-full min-h-[28px] resize-none bg-transparent text-[15px] leading-7 text-ink placeholder:text-faint focus:outline-none"
          />

          <div className="mt-2 flex items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                const files = imagesIn(e.target.files);
                if (files.length > 0) onFiles(files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!canSeeImages || images.length >= MAX_ATTACHMENTS}
              aria-label="이미지 첨부"
              title={attachTitle}
              className="h-8 w-8 shrink-0 rounded-lg border border-line inline-flex items-center justify-center text-sub hover:bg-sunken hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent transition-colors duration-150 ease-out"
            >
              <Plus className="w-4 h-4" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <ModelPicker llm={llm} model={model} onModel={onModel} disabled={isLoading} />
              {depth && onDepth && <DepthPicker value={depth} onChange={onDepth} caps={depthCaps} disabled={isLoading} />}
            </div>
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                aria-label={isExpanded ? '채팅 화면 접기' : '채팅 화면 펼치기'}
                title={isExpanded ? '사무실 보기 (접기) [Esc]' : '채팅 화면 펼치기 (사무실 덮기)'}
                className="h-8 w-8 shrink-0 rounded-lg inline-flex items-center justify-center text-sub hover:bg-sunken hover:text-ink transition-colors duration-150 ease-out"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4 text-accent" aria-hidden />
                ) : (
                  <Maximize2 className="w-4 h-4 text-sub" aria-hidden />
                )}
              </button>
            )}
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="멈추기"
                title="멈추기"
                className="h-8 w-8 shrink-0 rounded-lg bg-ink text-ground inline-flex items-center justify-center hover:opacity-85 transition-opacity duration-150 ease-out"
              >
                <Square className="w-3 h-3 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="보내기"
                title="보내기"
                className="h-8 w-8 shrink-0 rounded-lg bg-accent text-on-accent inline-flex items-center justify-center hover:bg-accent-hover disabled:bg-sunken disabled:text-faint transition-colors duration-150 ease-out"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.25]" aria-hidden />
              </button>
            )}
          </div>
        </form>
        {notice && (
          <p role="status" className="mt-1.5 px-1 text-xs text-danger">
            {notice}
          </p>
        )}
        <p className="mt-1.5 text-center text-[11px] text-faint">
          {aiName}는 실수할 수 있습니다. 중요한 정보는 다시 확인해 주세요.
        </p>
      </div>
    </div>
  );
};
