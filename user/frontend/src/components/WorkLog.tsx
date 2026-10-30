import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { Markdown } from './Markdown';
import type { Turn } from '../types';

// 작업 기록: 한 질문에 대해 누가(어느 AI가) 무슨 일을 얼마나 했는지 보여 주는 표.
// 채팅에는 총괄이 취합한 결과만 보이고, 전문가별 상세는 여기서 필요할 때만 연다. 데이터는 history에 저장되는 result 안에 있다.

const fmtSec = (s?: number | null) => (s == null ? '—' : s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`);

const th = 'px-3 py-2 text-left text-[11px] font-semibold text-faint whitespace-nowrap';
const td = 'px-3 py-2 align-top text-xs text-sub';
const tag = 'ml-1 rounded bg-sunken px-1.5 py-0.5 text-[11px] font-medium text-sub whitespace-nowrap';

export const WorkLogModal: React.FC<{ turn: Turn; onClose: () => void }> = ({ turn, onClose }) => {
  const r = turn.result;
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!r) return null;
  const rows = [...r.experts].sort((a, b) => (a.phase ?? 1) - (b.phase ?? 1));
  const steps = r.steps ?? [];
  const unresolved = r.qa?.unresolved ?? {};
  const totalChars = rows.reduce((n, x) => n + (r.agent_logs[x.id]?.chars ?? r.agent_logs[x.id]?.log?.length ?? 0), 0);

  // 채팅 패널 안의 쌓임 순서에 갇히면 사무실 3D 화면이 표 위로 비친다. body에 직접 그린다
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="작업 기록"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/30 p-3 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl anim-rise">
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">작업 기록</h2>
            <p className="mt-0.5 truncate text-xs text-sub" title={r.query}>
              {r.query}
            </p>
            <p className="mt-1 text-xs text-faint">
              전문가 {rows.length}명 · 전체 {fmtSec(r.total_sec)} · 전문가 결과 합계 {totalChars.toLocaleString()}자
              {turn.interview && turn.interview.answers.length > 0 ? ` · 인터뷰 답 ${turn.interview.answers.length}개` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="h-8 w-8 shrink-0 rounded-lg inline-flex items-center justify-center text-faint transition-colors duration-150 ease-out hover:bg-sunken hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          <section aria-label="전문가 작업">
            <h3 className="mb-1.5 text-xs font-semibold text-ink">전문가 작업</h3>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] border-collapse">
                <thead className="bg-sunken/60">
                  <tr>
                    <th className={th}>단계</th>
                    <th className={th}>전문가</th>
                    <th className={th}>관점</th>
                    <th className={th}>AI</th>
                    <th className={th}>맡은 일</th>
                    <th className={th}>소요</th>
                    <th className={th}>분량</th>
                    <th className={th}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => {
                    const log = r.agent_logs[x.id];
                    const isOpen = open === x.id;
                    const left = unresolved[x.id] ?? [];
                    return (
                      <React.Fragment key={x.id}>
                        <tr className="border-t border-line">
                          <td className={td}>{log?.phase ?? x.phase ?? 1}</td>
                          <td className={`${td} font-medium text-ink`}>
                            <button
                              type="button"
                              onClick={() => setOpen(isOpen ? null : x.id)}
                              aria-expanded={isOpen}
                              className="inline-flex items-center gap-1 text-left hover:underline underline-offset-2"
                            >
                              <ChevronRight className={`h-3 w-3 shrink-0 transition-transform duration-200 ease-out ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
                              {x.name}
                            </button>
                          </td>
                          <td className={`${td} whitespace-nowrap`}>{x.lens_ko ?? '—'}</td>
                          <td className={`${td} whitespace-nowrap`}>{log?.ai ?? '—'}</td>
                          <td className={`${td} max-w-[280px]`}>
                            <span className="line-clamp-2" title={log?.task ?? x.task}>
                              {log?.task ?? x.task}
                            </span>
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            {fmtSec(log?.elapsed)}
                            {log?.revise_sec != null && <span className="text-faint"> + 수정 {fmtSec(log.revise_sec)}</span>}
                          </td>
                          <td className={`${td} whitespace-nowrap`}>{log?.chars != null ? `${log.chars.toLocaleString()}자` : '—'}</td>
                          <td className={td}>
                            {log?.status === 'failed' ? <span className="text-danger">실패</span> : <span>완료</span>}
                            {log?.web && <span className={tag}>웹 조사</span>}
                            {log?.revised && <span className={tag}>QA 수정</span>}
                            {log?.added && <span className={tag}>QA 추가 투입</span>}
                            {left.length > 0 && <span className={`${tag} text-danger`}>미해결 {left.length}</span>}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-t border-line bg-sunken/30">
                            <td colSpan={8} className="px-4 py-3">
                              {x.done_when && <p className="mb-2 text-xs text-faint">완료 기준: {x.done_when}</p>}
                              {left.length > 0 && (
                                <ul className="mb-2 list-disc space-y-0.5 pl-4 text-xs text-danger">
                                  {left.map((l, i) => (
                                    <li key={i}>{l}</li>
                                  ))}
                                </ul>
                              )}
                              {log?.status === 'failed' ? (
                                <p className="text-xs text-danger">작업 실패: {log.log}</p>
                              ) : (
                                <Markdown content={log?.log || ''} className="!text-xs !leading-6 text-sub" />
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="편성·검토·종합 단계">
            <h3 className="mb-1.5 text-xs font-semibold text-ink">편성 · 검토 · 종합</h3>
            {steps.length === 0 ? (
              <p className="text-xs text-faint">이 질문은 단계별 기록이 남기 전에 실행돼서 표시할 내용이 없어요.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[480px] border-collapse">
                  <thead className="bg-sunken/60">
                    <tr>
                      <th className={th}>담당</th>
                      <th className={th}>한 일</th>
                      <th className={th}>AI</th>
                      <th className={th}>소요</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((s, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className={`${td} whitespace-nowrap font-medium text-ink`}>{s.who}</td>
                        <td className={td}>{s.what}</td>
                        <td className={`${td} whitespace-nowrap`}>{s.ai || '—'}</td>
                        <td className={`${td} whitespace-nowrap`}>{fmtSec(s.sec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};
