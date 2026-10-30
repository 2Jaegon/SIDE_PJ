import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Terminal,
  Copy,
  Check,
  Layers,
  Activity,
  Download,
  Cpu,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Hash,
  WrapText,
  FileCode,
  Sparkles,
  Info,
} from 'lucide-react';
import { DeskData } from './OfficeFloor';
import { Avatar } from './Avatar';

interface AgentTerminalModalProps {
  agent: DeskData | null;
  log?: string;
  status?: 'idle' | 'working' | 'done' | 'failed';
  onClose: () => void;
}

type TabType = 'terminal' | 'inspector' | 'metrics';

// 에이전트 ID별 기본 스킬 매핑 (지정된 스킬이 없을 때의 폴백 태그)
const AGENT_SKILL_PRESETS: Record<string, string[]> = {
  lead: ['harness2', 'court', 'prompts-chat', 'ecc-verification'],
  karpathy: ['karpathy', 'ecc-coding-standards', 'ecc-verification'],
  impeccable: ['impeccable', 'design-taste-frontend', 'ui-ux-pro-max'],
  'ecc-react': ['ecc-react', 'ecc-a11y', 'ecc-coding-standards'],
  'ecc-verification': ['ecc-verification', 'ecc-code-review', 'ecc-security-review'],
  'ui-ux-pro-max': ['ui-ux-pro-max', 'design-taste-frontend', 'emilkowalski'],
  taste: ['design-taste-frontend', 'awesome-claude-design', 'liquid-glass'],
  motion: ['motion', 'emilkowalski', 'react-three-fiber'],
  'react-three-fiber': ['react-three-fiber', 'motion', 'shadergradient'],
  'liquid-glass': ['liquid-glass', 'liquid-logo', 'ui-ux-pro-max'],
  'liquid-logo': ['liquid-logo', 'liquid-glass', 'awesome-claude-design'],
  context7: ['context7', 'ecc-api-design'],
  firecrawl: ['firecrawl', 'scrapling', 'agent-browser'],
  'agent-browser': ['agent-browser', 'playwright-mcp', 'ecc-e2e'],
  'playwright-mcp': ['playwright-mcp', 'agent-browser', 'ecc-e2e'],
  strix: ['strix', 'rea', 'ecc-security-review'],
  'k-skill': ['k-skill', 'im-not-ai', 'anthropic-skills'],
  'im-not-ai': ['im-not-ai', 'prompts-chat'],
  court: ['court', 'harness2', 'ecc-verification'],
  headroom: ['headroom', 'graphify'],
  graphify: ['graphify', 'scientific'],
  'mcp-builder': ['mcp-builder', 'ecc-api-design', 'ecc-fastapi'],
  'ecc-fastapi': ['ecc-fastapi', 'ecc-api-design', 'ecc-security-review'],
};

export const AgentTerminalModal: React.FC<AgentTerminalModalProps> = ({
  agent,
  log,
  status: propStatus,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(true);

  // ESC 키 닫기 이벤트 핸들러
  useEffect(() => {
    if (!agent) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agent, onClose]);

  // 모달이 새로 열릴 때 복사 상태 리셋
  useEffect(() => {
    setCopied(false);
  }, [agent?.id]);

  // 에이전트의 현재 실행 상태 유추
  const currentStatus = useMemo(() => {
    if (propStatus) return propStatus;
    if (!log || log.trim().length === 0) return 'idle';
    if (log.includes('작업 실패') || log.includes('error') || log.includes('Error')) return 'failed';
    return 'done';
  }, [propStatus, log]);

  // 투입된 스킬 태그 목록 추출
  const activeSkills = useMemo(() => {
    if (!agent) return [];
    if (agent.skills && agent.skills.length > 0) return agent.skills;
    const preset = AGENT_SKILL_PRESETS[agent.id];
    if (preset && preset.length > 0) return preset;
    // 폴백 태그
    const fallback: string[] = [];
    if (agent.badge_label) fallback.push(agent.badge_label);
    fallback.push('gon-core');
    return fallback;
  }, [agent]);

  // 로그 메트릭 계산
  const metrics = useMemo(() => {
    const raw = log || '';
    const charCount = raw.length;
    const lines = raw ? raw.split('\n') : [];
    const lineCount = lines.length;
    const estTokens = Math.round(charCount / 2.8);
    return { charCount, lineCount, estTokens, lines };
  }, [log]);

  // 클립보드 복사
  const handleCopy = async () => {
    if (!log) return;
    try {
      await navigator.clipboard.writeText(log);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 무시 */
    }
  };

  // 로그 파일 다운로드
  const handleDownload = () => {
    if (!log || !agent) return;
    const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-${agent.id}-output.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!agent) return null;

  // 상태별 뱃지 및 프로그레스 퍼센트
  const statusConfig = {
    working: {
      label: '실행 중',
      color: 'text-accent border-accent/40 bg-accent-soft',
      dotColor: 'bg-accent',
      progress: 68,
      step: 'Step 3: 실행 및 추론 중',
    },
    done: {
      label: '작업 완료',
      color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
      dotColor: 'bg-emerald-500',
      progress: 100,
      step: 'Step 4: 검증 및 종합 완료',
    },
    failed: {
      label: '실행 실패',
      color: 'text-danger border-danger/30 bg-danger-soft',
      dotColor: 'bg-danger',
      progress: 75,
      step: 'Step 3: 에러 발생 후 중단',
    },
    idle: {
      label: '대기 중',
      color: 'text-faint border-line bg-sunken',
      dotColor: 'bg-faint',
      progress: 25,
      step: 'Step 1: 책상 배치 완료 (대기)',
    },
  }[currentStatus];

  return (
    <div
      className="fixed inset-0 bg-ink/40 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-[2px] transition-opacity"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${agent.character_name} 에이전트 인스펙터 콘솔`}
        onClick={(e) => e.stopPropagation()}
        className="anim-rise w-full max-w-2xl bg-surface border border-line rounded-t-xl sm:rounded-lg shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
      >
        {/* 상단 헤더: 아바타, 이름, 직무, 상태 칩, 닫기 버튼 */}
        <div className="px-5 py-3.5 border-b border-line bg-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar accent={agent.accent} name={agent.character_name} size={36} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink truncate leading-tight">
                  {agent.character_name}
                </h2>
                {agent.badge_label && (
                  <span className="shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded bg-sunken text-sub border border-line">
                    {agent.badge_label}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} ${
                      currentStatus === 'working' ? 'working-dot' : ''
                    }`}
                    aria-hidden
                  />
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-xs text-sub truncate mt-0.5">{agent.name || agent.role_korean}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 -mr-1 rounded-md text-sub hover:text-ink hover:bg-sunken transition-colors duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 파이프라인 진행률 바 (HUD) */}
        <div className="px-5 py-2.5 bg-ground/60 border-b border-line/60 flex items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-2 text-sub min-w-0">
            <Clock className="w-3.5 h-3.5 text-faint shrink-0" />
            <span className="truncate">{statusConfig.step}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] text-faint">{statusConfig.progress}%</span>
            <div className="w-20 sm:w-28 h-1.5 bg-line rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  currentStatus === 'failed'
                    ? 'bg-danger'
                    : currentStatus === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-accent'
                }`}
                style={{ width: `${statusConfig.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div
          role="tablist"
          className="flex items-center gap-1 px-4 pt-2 border-b border-line bg-surface shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'terminal'}
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all duration-150 ${
              activeTab === 'terminal'
                ? 'border-accent text-accent'
                : 'border-transparent text-sub hover:text-ink hover:border-line'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>터미널 콘솔</span>
            {metrics.lineCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-sunken text-sub border border-line">
                {metrics.lineCount}L
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'inspector'}
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all duration-150 ${
              activeTab === 'inspector'
                ? 'border-accent text-accent'
                : 'border-transparent text-sub hover:text-ink hover:border-line'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>스킬 & 지침 인스펙터</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-sunken text-sub border border-line">
              {activeSkills.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'metrics'}
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all duration-150 ${
              activeTab === 'metrics'
                ? 'border-accent text-accent'
                : 'border-transparent text-sub hover:text-ink hover:border-line'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>실행 메트릭</span>
          </button>
        </div>

        {/* 탭 본문 영역 */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-ground/30">
          {/* TAB 1: 터미널 콘솔 */}
          {activeTab === 'terminal' && (
            <div className="p-4 flex flex-col h-full min-h-[320px]">
              {/* 터미널 윈도우 프레임 */}
              <div className="flex-1 flex flex-col rounded-lg border border-zinc-800 bg-[#0f141c] text-zinc-200 overflow-hidden shadow-inner">
                {/* 터미널 상단 툴바 */}
                <div className="px-3 py-2 bg-[#161d27] border-b border-zinc-800 flex items-center justify-between text-xs shrink-0 select-none">
                  {/* macOS / Unix 스타일 윈도우 닷 */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    </div>
                    <span className="ml-2 font-mono text-[11px] text-zinc-400 truncate">
                      gon@{agent.id}:~$ cat output.log
                    </span>
                  </div>

                  {/* 터미널 액션 버튼들 */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={showLineNumbers ? '줄 번호 숨기기' : '줄 번호 표시'}
                      onClick={() => setShowLineNumbers(!showLineNumbers)}
                      className={`p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors ${
                        showLineNumbers ? 'text-accent' : ''
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      title={wrapLines ? '줄 바꿈 끄기' : '줄 바꿈 켜기'}
                      onClick={() => setWrapLines(!wrapLines)}
                      className={`p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors ${
                        wrapLines ? 'text-accent' : ''
                      }`}
                    >
                      <WrapText className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-3 bg-zinc-700 mx-1" />

                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={!log}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-zinc-800/90 text-zinc-200 hover:bg-zinc-700 hover:text-white disabled:opacity-40 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>복사</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={!log}
                      title="로그 파일 다운로드 (.log)"
                      className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 터미널 출력 콘솔 내용 */}
                <div className="p-3.5 font-mono text-xs overflow-y-auto flex-1 max-h-[380px] space-y-1">
                  {/* CLI 메타 정보 헤더 */}
                  <div className="text-zinc-500 pb-2 mb-2 border-b border-zinc-800/70 select-none text-[11px] leading-relaxed">
                    <p className="text-zinc-400">
                      [GON RUNTIME] Initialized agent worker{' '}
                      <span className="text-accent">`{agent.id}`</span> ({agent.character_name})
                    </p>
                    <p>
                      [CONTEXT] Role: {agent.name || agent.role_korean} | Mode: standard-stream
                    </p>
                  </div>

                  {/* 로그 텍스트 출력 */}
                  {log ? (
                    <div
                      className={`text-zinc-200 leading-relaxed ${
                        wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
                      }`}
                    >
                      {showLineNumbers ? (
                        metrics.lines.map((line, idx) => (
                          <div key={idx} className="flex hover:bg-zinc-800/40 py-0.5 rounded px-1 -mx-1">
                            <span className="w-8 shrink-0 select-none text-right pr-3 text-zinc-600 text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="flex-1">{line || ' '}</span>
                          </div>
                        ))
                      ) : (
                        <div>{log}</div>
                      )}
                      {currentStatus === 'working' && (
                        <div className="flex items-center gap-1.5 text-accent mt-2 pt-2 border-t border-zinc-800/60">
                          <span className="inline-block w-2 h-4 bg-accent animate-pulse" />
                          <span className="text-[11px] text-zinc-400">실시간 추론 스트리밍 중...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-10 text-center select-none space-y-2">
                      <Terminal className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
                      <p className="text-zinc-400 font-sans text-xs">
                        아직 출력된 실행 기록이 없습니다.
                      </p>
                      <p className="text-zinc-600 text-[11px]">
                        &gt; Waiting for task dispatch from Gon supervisor...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 스킬 & 지침 인스펙터 */}
          {activeTab === 'inspector' && (
            <div className="p-5 space-y-5">
              {/* 투입된 스킬 태그 뱃지 섹션 */}
              <section className="bg-surface border border-line rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    <h3 className="text-xs font-semibold text-ink">투입된 스킬 및 전문 지침</h3>
                  </div>
                  <span className="text-[11px] text-faint">총 {activeSkills.length}개 바인딩</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {activeSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-sunken border border-line text-ink hover:border-accent/60 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-accent" />
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              {/* 맡은 역할 및 업무 사양 */}
              <section className="bg-surface border border-line rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-ink">맡은 역할 및 사양</h3>
                </div>
                <p className="text-sm leading-6 text-sub bg-ground/60 rounded-md p-3 border border-line/60">
                  {agent.description || '지정된 상세 역할 설명이 없습니다.'}
                </p>
              </section>

              {/* 에이전트 인프라 메타데이터 */}
              <section className="bg-surface border border-line rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold text-ink flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-accent" />
                  <span>런타임 사양 및 메타데이터</span>
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-ground/50 border border-line/50">
                    <span className="text-faint block text-[11px] mb-0.5">에이전트 고유 ID</span>
                    <span className="font-mono font-medium text-ink truncate block">
                      {agent.id}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-ground/50 border border-line/50">
                    <span className="text-faint block text-[11px] mb-0.5">전문 분야 클러스터</span>
                    <span className="font-medium text-ink truncate block">
                      {agent.badge_label || '일반 전문가'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-ground/50 border border-line/50">
                    <span className="text-faint block text-[11px] mb-0.5">사무실 책상 인덱스</span>
                    <span className="font-mono font-medium text-ink">
                      Desk #{agent.desk_index ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-ground/50 border border-line/50">
                    <span className="text-faint block text-[11px] mb-0.5">테마 포인트 색상</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-line"
                        style={{ backgroundColor: agent.accent }}
                      />
                      <span className="text-ink">{agent.accent}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: 실행 메트릭 */}
          {activeTab === 'metrics' && (
            <div className="p-5 space-y-5">
              {/* 메트릭 통계 카드 그리드 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface border border-line rounded-lg p-3.5 text-center">
                  <span className="text-[11px] text-faint block mb-1">총 출력 글자수</span>
                  <span className="text-lg font-bold text-ink font-mono">
                    {metrics.charCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-faint block mt-0.5">Characters</span>
                </div>

                <div className="bg-surface border border-line rounded-lg p-3.5 text-center">
                  <span className="text-[11px] text-faint block mb-1">총 라인 수</span>
                  <span className="text-lg font-bold text-ink font-mono">
                    {metrics.lineCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-faint block mt-0.5">Lines</span>
                </div>

                <div className="bg-surface border border-line rounded-lg p-3.5 text-center">
                  <span className="text-[11px] text-faint block mb-1">추정 토큰 수</span>
                  <span className="text-lg font-bold text-accent font-mono">
                    ~{metrics.estTokens.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-faint block mt-0.5">Est. Tokens</span>
                </div>
              </div>

              {/* 파이프라인 단계별 체크리스트 타임라인 */}
              <section className="bg-surface border border-line rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold text-ink flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>실행 및 QA 라이프사이클</span>
                </h3>

                <div className="space-y-2.5 pt-1 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-ground/50 border border-line/40">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-ink">1. 전문가 편성 및 책상 할당</span>
                    </div>
                    <span className="text-[11px] text-sub">완료</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-ground/50 border border-line/40">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-ink">2. 스킬 지침 및 사용자 맥락 주입</span>
                    </div>
                    <span className="text-[11px] text-sub">완료</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-ground/50 border border-line/40">
                    <div className="flex items-center gap-2">
                      {currentStatus === 'working' ? (
                        <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                      ) : currentStatus === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : currentStatus === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-line shrink-0" />
                      )}
                      <span className="font-medium text-ink">3. 단독 추론 및 전문 분석 생성</span>
                    </div>
                    <span
                      className={`text-[11px] ${
                        currentStatus === 'working'
                          ? 'text-accent font-semibold'
                          : currentStatus === 'done'
                          ? 'text-emerald-500'
                          : currentStatus === 'failed'
                          ? 'text-danger'
                          : 'text-faint'
                      }`}
                    >
                      {currentStatus === 'working'
                        ? '진행 중'
                        : currentStatus === 'done'
                        ? '완료'
                        : currentStatus === 'failed'
                        ? '실패'
                        : '대기'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-ground/50 border border-line/40">
                    <div className="flex items-center gap-2">
                      {currentStatus === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-line shrink-0" />
                      )}
                      <span className="font-medium text-ink">4. 교차 검토 및 QA 검증 통과</span>
                    </div>
                    <span className="text-[11px] text-faint">
                      {currentStatus === 'done' ? '통과' : '대기'}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* 하단 풋터 바 */}
        <div className="px-5 py-3 border-t border-line bg-surface flex items-center justify-between text-xs text-sub shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-faint">ESC 키로 닫기</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md bg-sunken hover:bg-line text-ink font-medium text-xs transition-colors duration-150"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
