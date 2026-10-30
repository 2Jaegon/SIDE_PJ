import React, { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import type { InterviewMode, InterviewState, QaReport, SkillGap } from '../types';

// 팀 작업 흐름의 사람이 개입하거나 읽는 부분:
//  1) 요구사항 인터뷰(grill-me): 팀을 꾸리기 전에 추천 답이 달린 질문에 답한다
//  2) QA 보고: 긍정·부정 평가 → 수정 → 재확인 결과
//  3) 스킬 후보(find-skills): 풀에 없는 능력의 후보를 보여 주고, 사용자가 고르면 받는다

const chip = (on: boolean) =>
  `rounded-lg border px-2.5 py-1.5 text-left text-xs leading-5 transition-colors duration-150 ease-out ${
    on ? 'border-accent bg-accent-soft text-ink' : 'border-line text-sub hover:bg-sunken hover:text-ink'
  }`;

interface InterviewProps {
  state: InterviewState;
  active: boolean; // 지금 답을 기다리는 중인가
  onAnswer: (answers: Record<string, string> | null) => void;
}

export const InterviewCard: React.FC<InterviewProps> = ({ state, active, onAnswer }) => {
  const [picked, setPicked] = useState<Record<string, string>>(() =>
    Object.fromEntries(state.questions.map((q) => [q.id, q.recommended || q.options[0] || ''])),
  );
  const [typed, setTyped] = useState<Record<string, string>>({});
  const value = (id: string) => (typed[id]?.trim() ? typed[id].trim() : picked[id] ?? '');
  const boxRef = useRef<HTMLElement>(null);
  const asking = state.status === 'asking' && active;
  useEffect(() => {
    if (asking) boxRef.current?.scrollIntoView({ block: 'nearest' }); // 카드가 새로 뜨면 버튼까지 화면에 들어오게
  }, [asking]);

  if (state.status === 'asking' && active) {
    return (
      <section ref={boxRef} aria-label="요구사항 인터뷰" className="mb-3 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 anim-rise">
        <header>
          <h3 className="text-sm font-semibold text-ink">
            요구사항 인터뷰 <span className="font-normal text-faint">· {state.round}번째 질문</span>
          </h3>
          <p className="mt-0.5 text-xs text-sub">팀을 꾸리기 전에 요청을 구체화해요. 추천 답이 미리 골라져 있어서 그대로 진행해도 돼요.</p>
        </header>
        <div className="max-h-[min(50vh,420px)] space-y-4 overflow-y-auto pr-1">
        {state.questions.map((q, i) => (
          <fieldset key={q.id} className="space-y-2">
            <legend className="text-[13px] font-medium text-ink">
              {i + 1}. {q.title}
            </legend>
            {q.body && <p className="text-xs leading-5 text-sub">{q.body}</p>}
            <div role="radiogroup" aria-label={q.title} className="flex flex-wrap gap-1.5">
              {q.options.map((o) => {
                const on = !typed[q.id]?.trim() && picked[q.id] === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setPicked((p) => ({ ...p, [q.id]: o }));
                      setTyped((t) => ({ ...t, [q.id]: '' }));
                    }}
                    className={chip(on)}
                  >
                    {o}
                    {o === q.recommended && <span className="ml-1 text-[11px] text-accent">추천</span>}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={typed[q.id] ?? ''}
              onChange={(e) => setTyped((t) => ({ ...t, [q.id]: e.target.value }))}
              maxLength={600}
              placeholder="직접 입력"
              aria-label={`${q.title} 직접 입력`}
              className="h-8 w-full rounded-lg border border-line bg-transparent px-2.5 text-xs text-ink placeholder:text-faint focus:border-faint/70 focus:outline-none"
            />
          </fieldset>
        ))}
        </div>
        <footer className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onAnswer(null)}
            className="h-8 rounded-lg border border-line px-3 text-xs font-medium text-ink transition-colors duration-150 ease-out hover:bg-raised"
          >
            인터뷰 건너뛰기
          </button>
          <button
            type="button"
            onClick={() => onAnswer(Object.fromEntries(state.questions.map((q) => [q.id, value(q.id)])))}
            className="h-8 rounded-lg bg-accent px-3 text-xs font-medium text-on-accent transition-colors duration-150 ease-out hover:bg-accent-hover"
          >
            이대로 진행
          </button>
        </footer>
      </section>
    );
  }

  if (state.answers.length === 0 && !state.brief) return null;
  return (
    <details className="mb-3 text-xs">
      <summary className="cursor-pointer select-none text-faint transition-colors duration-150 ease-out hover:text-ink">
        요구사항 인터뷰 · 답 {state.answers.length}개로 확정
      </summary>
      <div className="mt-2 space-y-2 border-l-2 border-line pl-3.5 text-sub">
        {state.answers.map((a, i) => (
          <p key={i}>
            <span className="font-medium text-ink">{a.title}</span> — {a.answer}
          </p>
        ))}
        {state.assumptions && state.assumptions.length > 0 && <p>추천으로 확정한 것: {state.assumptions.join(' / ')}</p>}
        {state.brief && <p className="whitespace-pre-wrap leading-5">{state.brief}</p>}
      </div>
    </details>
  );
};

// QA 보고: 평가 → 수정 → 재확인 결과 요약
export const QaSummary: React.FC<{ report: QaReport; names: Record<string, string> }> = ({ report, names }) => {
  if (!report.ran) {
    return report.skipped ? <p className="text-xs text-faint">QA 건너뜀 · {report.skipped}</p> : null;
  }
  const unresolved = Object.entries(report.unresolved ?? {});
  return (
    <div className="space-y-1 text-xs text-sub">
      <p>
        <span className="font-medium text-ink">QA</span> · 평가 {report.reviewed?.length ?? 0}명 · 수정 {report.revised?.length ?? 0}명 · 재확인 통과{' '}
        {report.passed?.length ?? 0}명 · {report.rounds ?? 0}라운드
      </p>
      {report.added && report.added.length > 0 && <p>개선을 위해 추가 투입 {report.added.length}명</p>}
      {report.summary && <p>{report.summary}</p>}
      {report.conflicts?.map((c, i) => (
        <p key={i}>충돌 정리: {c}</p>
      ))}
      {unresolved.map(([id, items]) => (
        <p key={id} className="text-danger">
          미해결 · {names[id] ?? id}: {items.join(' / ')}
        </p>
      ))}
      {report.final && (
        <div>
          <p className={report.final.verdict === 'pass' ? 'text-ink' : 'text-danger'}>
            <span className="font-medium">최종 점검</span> · {report.final.verdict === 'pass' ? '통과' : '확인할 것이 있어요'}
          </p>
          {report.final.checks.map((c, i) => (
            <p key={i}>
              {c.ok ? '✓' : '△'} {c.item}
              {c.note ? ` — ${c.note}` : ''}
            </p>
          ))}
          {report.final.notes.map((n, i) => (
            <p key={`n${i}`}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
};

type InstallState = { status: 'idle' | 'working' | 'done' | 'error'; message?: string };

// find-skills가 찾은 후보. 설치는 사용자가 누를 때만 한다(받은 스킬은 참고 지침으로만 쓰이고, 그 안의 명령은 실행하지 않는다)
export const SkillGapCard: React.FC<{ gaps: SkillGap[] }> = ({ gaps }) => {
  const [state, setState] = useState<Record<string, InstallState>>({});
  const install = async (ref: string) => {
    setState((s) => ({ ...s, [ref]: { status: 'working' } }));
    try {
      const res = await fetch('/api/office/skills/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && data.ok;
      setState((s) => ({ ...s, [ref]: { status: ok ? 'done' : 'error', message: data.message ?? '설치하지 못했어요' } }));
    } catch {
      setState((s) => ({ ...s, [ref]: { status: 'error', message: '서버에 연결하지 못했어요' } }));
    }
  };

  return (
    <section aria-label="스킬 후보" className="rounded-xl border border-line bg-sunken/60 p-3.5 text-xs">
      <h3 className="font-medium text-ink">팀에 없는 능력을 찾았어요</h3>
      <p className="mt-0.5 text-sub">이번 답에는 반영되지 않았어요. 설치하면 다음 요청부터 팀 후보가 돼요. 받은 스킬은 참고 지침으로만 쓰여요.</p>
      <div className="mt-2.5 space-y-3">
        {gaps.map((g) => (
          <div key={g.query}>
            <p className="font-medium text-ink">{g.need}</p>
            <ul className="mt-1 space-y-1">
              {g.candidates.map((c) => {
                const st = state[c.ref] ?? { status: 'idle' };
                return (
                  <li key={c.ref} className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink">{c.ref}</code>
                    <span className="text-faint">{c.installs} installs</span>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-faint underline-offset-2 hover:text-ink hover:underline">
                        출처 <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={st.status === 'working' || st.status === 'done'}
                      onClick={() => install(c.ref)}
                      className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg border border-line px-2.5 font-medium text-ink transition-colors duration-150 ease-out hover:bg-raised disabled:opacity-60"
                    >
                      {st.status === 'working' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                      {st.status === 'done' && <Check className="h-3 w-3 text-accent" aria-hidden />}
                      {st.status === 'done' ? '설치됨' : st.status === 'working' ? '받는 중' : '설치'}
                    </button>
                    {st.status === 'error' && <span role="alert" className="basis-full text-danger">{st.message}</span>}
                    {st.status === 'done' && <span className="basis-full text-sub">{st.message}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

// 인터뷰 모드: 끔 / 간단(한 번만 묻는다) / 심층(최대 두 번). 입력창 아래 줄에서 깊이 선택 옆에 놓는다
const MODES: { id: InterviewMode; label: string; hint: string }[] = [
  { id: 'off', label: '끔', hint: '인터뷰 없이 바로 진행해요' },
  { id: 'quick', label: '간단', hint: '요청이 크면 한 번만 물어보고 진행해요' },
  { id: 'deep', label: '심층', hint: '요청이 크면 최대 두 번 물어보고 진행해요' },
];

export const InterviewModePicker: React.FC<{ value: InterviewMode; onChange: (m: InterviewMode) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => (
  <div role="radiogroup" aria-label="인터뷰 모드" className="inline-flex h-8 shrink-0 items-center rounded-lg bg-sunken p-0.5 border border-line/60">
    <span className="pl-2.5 pr-1 text-xs text-faint">인터뷰</span>
    {MODES.map((m) => {
      const on = m.id === value;
      return (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={on}
          title={m.hint}
          disabled={disabled}
          onClick={() => onChange(m.id)}
          className={`h-7 rounded-[6px] px-2.5 min-w-[42px] text-center text-xs font-medium transition-colors duration-200 ease-out disabled:opacity-50 ${
            on ? 'bg-surface text-ink shadow-sm' : 'text-faint hover:text-ink'
          }`}
        >
          {m.label}
        </button>
      );
    })}
  </div>
);
