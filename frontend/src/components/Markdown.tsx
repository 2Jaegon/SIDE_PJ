import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

// 채팅 답변용 마크다운 렌더러. 스트리밍 중에는 닫히지 않은 코드 블록·표도 그대로 그린다.
// 지원: 제목(#~####), 문단, 목록, 인용, 표, 구분선, ``` 코드 블록, ```chart 막대 차트, `코드`, **굵게**, *기울임*, [링크](http…)

const SAFE_URL = /^https?:\/\//i;

const renderInline = (text: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (m[1]) out.push(<code key={k++} className="px-1.5 py-0.5 rounded bg-sunken font-mono text-[0.9em]">{t.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k++} className="font-semibold">{t.slice(2, -2)}</strong>);
    else if (m[3]) out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    else {
      const label = t.slice(1, t.indexOf(']('));
      const href = t.slice(t.indexOf('](') + 2, -1);
      out.push(
        SAFE_URL.test(href) ? (
          <a key={k++} href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">
            {label}
          </a>
        ) : (
          label
        ),
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

const CodeBlock: React.FC<{ lang: string; code: string }> = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 권한이 없으면 조용히 넘어간다 */
    }
  };
  return (
    <div className="my-3 rounded-lg border border-line overflow-hidden">
      <div className="flex items-center justify-between h-8 px-3 bg-sunken text-xs text-faint">
        <span>{lang || '코드'}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 hover:text-ink transition-colors duration-200 ease-out">
          {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto bg-raised text-[13px] leading-6">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
};

// ```chart 블록: {"type":"bar","title","unit","labels":[],"values":[]}. 읽을 수 없으면(스트리밍 중 포함) null
interface ChartSpec {
  title: string;
  unit: string;
  rows: { label: string; value: number }[];
}

const parseChart = (code: string): ChartSpec | null => {
  try {
    const d = JSON.parse(code);
    const labels: unknown[] = Array.isArray(d.labels) ? d.labels : [];
    const values: unknown[] = Array.isArray(d.values) ? d.values : [];
    const rows = labels
      .map((l, j) => ({ label: String(l), value: Number(values[j]) }))
      .filter((r) => Number.isFinite(r.value))
      .slice(0, 20);
    return rows.length > 0 ? { title: String(d.title ?? ''), unit: String(d.unit ?? ''), rows } : null;
  } catch {
    return null;
  }
};

const BarChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const max = Math.max(...spec.rows.map((r) => Math.abs(r.value)), 0) || 1;
  return (
    <figure className="my-4 rounded-lg border border-line p-4">
      {spec.title && <figcaption className="mb-3 text-sm font-semibold text-ink">{spec.title}</figcaption>}
      <ul className="space-y-2">
        {spec.rows.map((r, j) => (
          <li key={j} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-sub" title={r.label}>
              {r.label}
            </span>
            <span className="h-2.5 rounded-full bg-sunken overflow-hidden" aria-hidden>
              <span
                className={`block h-full rounded-full ${r.value < 0 ? 'bg-danger' : 'bg-accent'}`}
                style={{ width: `${(Math.abs(r.value) / max) * 100}%` }}
              />
            </span>
            <span className="tabular-nums text-ink">
              {r.value.toLocaleString('ko-KR')}
              {spec.unit}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
};

const isRow = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|');
const cells = (l: string) => l.trim().slice(1, -1).split('|').map((c) => c.trim());
const isDivider = (l: string) => cells(l).every((c) => /^:?-+:?$/.test(c));
const isBlockStart = (l: string) => /^(#{1,4} |```|>|[-*] |\d+\. |\||---$|\*\*\*$|___$)/.test(l.trim());

export const Markdown: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const els: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i++; // 닫는 ```(스트리밍 중이면 없을 수 있다)
      const chart = lang === 'chart' ? parseChart(body.join('\n')) : null;
      els.push(chart ? <BarChart key={k++} spec={chart} /> : <CodeBlock key={k++} lang={lang} code={body.join('\n')} />);
      continue;
    }

    const h = line.match(/^(#{1,4}) (.*)$/);
    if (h) {
      const size = ['text-xl font-bold mt-6 mb-3', 'text-lg font-semibold mt-6 mb-2.5', 'text-base font-semibold mt-5 mb-2', 'text-[15px] font-semibold mt-4 mb-1.5'][h[1].length - 1];
      const Tag = (['h3', 'h4', 'h5', 'h6'] as const)[h[1].length - 1];
      els.push(<Tag key={k++} className={`${size} text-ink first:mt-0`}>{renderInline(h[2])}</Tag>);
      i++;
      continue;
    }

    if (/^(---|\*\*\*|___)$/.test(line)) {
      els.push(<hr key={k++} className="my-5 border-line" />);
      i++;
      continue;
    }

    if (line.startsWith('>')) {
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) q.push(lines[i++].trim().replace(/^>\s?/, ''));
      els.push(
        <blockquote key={k++} className="my-3 pl-4 border-l-2 border-line text-sub">
          {q.map((x, j) => <p key={j}>{renderInline(x)}</p>)}
        </blockquote>,
      );
      continue;
    }

    if (isRow(line)) {
      const rows: string[] = [];
      while (i < lines.length && isRow(lines[i])) rows.push(lines[i++]);
      const hasHead = rows.length >= 2 && isDivider(rows[1]);
      const head = hasHead ? cells(rows[0]) : null;
      const body = (hasHead ? rows.slice(2) : rows).map(cells);
      els.push(
        <div key={k++} className="my-3 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            {head && (
              <thead>
                <tr className="border-b border-line">
                  {head.map((c, j) => <th key={j} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{renderInline(c)}</th>)}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} className="border-b border-line last:border-0">
                  {r.map((c, j) => <td key={j} className="px-3 py-2 align-top tabular-nums">{renderInline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      const itemRe = ordered ? /^\d+\. / : /^[-*] /;
      while (i < lines.length && itemRe.test(lines[i].trim())) items.push(lines[i++].trim().replace(itemRe, ''));
      const List = ordered ? 'ol' : 'ul';
      els.push(
        <List key={k++} className={`my-3 pl-6 space-y-1.5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-faint`}>
          {items.map((x, j) => <li key={j} className="pl-1">{renderInline(x)}</li>)}
        </List>,
      );
      continue;
    }

    // 문단: 빈 줄이나 다른 블록이 나올 때까지 이어진 줄을 한 문단으로 묶는다
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++].trim());
    els.push(
      <p key={k++} className="my-3 first:mt-0">
        {para.map((x, j) => (
          <React.Fragment key={j}>
            {j > 0 && <br />}
            {renderInline(x)}
          </React.Fragment>
        ))}
      </p>,
    );
  }

  return <div className={`text-[15px] leading-7 text-ink break-words ${className}`}>{els}</div>;
};
