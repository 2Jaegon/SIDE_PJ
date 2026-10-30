import type { DeskData } from './components/OfficeFloor';
import type { FeedItem } from './components/ActivityFeed';

export interface Expert {
  id: string;
  name: string;
  kind: string;
  cluster: string;
  cluster_ko?: string;
  accent: string;
  use_for: string;
  task: string;
  sub_question?: string;
  lens?: Lens;
  lens_ko?: string;
  done_when?: string;
  phase?: number; // 같은 단계는 동시에, 뒤 단계는 앞 단계 결과를 받아 일한다
  via?: string | null; // 서브 AI(gemini|codex)에 맡긴 일이면 그 이름
  added?: boolean; // QA가 개선을 위해 추가로 투입한 전문가
}

export type Route = 'team' | 'direct';
export type InterviewMode = 'off' | 'quick' | 'deep'; // 인터뷰: 끔 / 간단(한 번) / 심층(최대 두 번)
export type Lens = 'dev' | 'service'; // 개발자 관점 / 서비스 관점
export type Depth = 'fast' | 'normal' | 'deep'; // 팀 인원 상한: 빠르게 / 보통 / 깊게

// 연결된 AI. images: 첨부 이미지를 실제로 볼 수 있는지
export interface ModelOption {

  id: string; // '' = 연결된 AI의 기본 모델

  label: string;

  note?: string;

  quota_exceeded?: boolean;

}

export interface LlmInfo {
  kind: string | null;
  label: string;
  images: boolean;
  image_label?: string;
  fallback?: { from: string; until: number; until_formatted?: string };
  models?: ModelOption[]; // 첫 번째가 기본값. 비어 있으면 고를 수 없다
}

// 요구사항 인터뷰(grill-me): 팀을 꾸리기 전에 추천 답이 달린 질문을 라운드 단위로 묻는다
export interface InterviewQuestion {
  id: string;
  title: string;
  body: string;
  options: string[];
  recommended: string;
}

export interface InterviewState {
  status: 'asking' | 'answered' | 'done';
  round: number;
  questions: InterviewQuestion[];
  answers: { title: string; answer: string }[];
  brief?: string;
  assumptions?: string[];
}

export interface InterviewReply {
  ready: boolean;
  questions: InterviewQuestion[];
  brief: string;
  assumptions: string[];
}

// QA 루프 결과: 긍정·부정 평가 → QA 정리·재배포 → 수정 → QA 재확인
export interface QaFinal {
  verdict: 'pass' | 'warn';
  checks: { item: string; ok: boolean; note: string }[];
  notes: string[];
}

export interface QaReport {
  ran: boolean;
  skipped?: string;
  rounds?: number;
  reviewed?: string[];
  revised?: string[];
  added?: string[];
  final?: QaFinal;
  passed?: string[];
  unresolved?: Record<string, string[]>;
  conflicts?: string[];
  summary?: string;
}

export interface SkillGap {
  need: string;
  query: string;
  candidates: { ref: string; installs: string; url: string }[];
}

export interface Result {
  mode: 'ai' | 'stub';
  route?: Route;
  query: string;
  intent?: string;
  plan_reason: string;
  sub_questions?: string[];
  experts: Expert[];
  agent_logs: Record<
    string,
    {
      name: string;
      status: string;
      log: string;
      sub_question?: string;
      revised?: boolean;
      added?: boolean;
      // 작업 기록 표용: 누가(어느 AI가) 무엇을 몇 초, 몇 자로 했는지
      task?: string;
      phase?: number;
      lens?: string;
      ai?: string;
      web?: boolean;
      elapsed?: number | null;
      revise_sec?: number | null;
      chars?: number;
    }
  >;
  final_content: string;
  prompt_coach_tip: string;
  qa?: QaReport | null;
  skill_gaps?: SkillGap[];
  steps?: { who: string; what: string; ai: string; sec: number }[]; // 편성·검토·종합 단계 기록
  total_sec?: number;
}

export type StreamEvent =
  | { type: 'start'; mode: 'ai' | 'stub'; lead: Expert; llm?: LlmInfo }
  | { type: 'plan'; route?: Route; reason: string; intent?: string; sub_questions?: string[]; experts: Expert[]; llm?: LlmInfo }
  | { type: 'delta'; text: string }
  | { type: 'agent'; id: string; status: 'done' | 'error'; text: string; revised?: boolean; added?: boolean }
  | { type: 'plan_add'; expert: Expert }
  | { type: 'review'; stage: 'start'; reviewers: Expert[]; targets: string[] }
  | { type: 'review'; stage: 'done'; reviewer: Expert; status: 'done' | 'error'; summary: string }
  | { type: 'qa'; stage: 'triage'; qa: Expert; summary: string; conflicts: string[]; assignments: { id: string; name: string; must_fix: string[] }[]; additions?: { id: string; name: string; task: string }[] }
  | { type: 'qa'; stage: 'verify'; round: number; qa: Expert; note: string; overall: 'pass' | 'fail'; checks: { id: string; name: string; verdict: string; unresolved: string[] }[] }
  | { type: 'qa'; stage: 'final'; qa: Expert; verdict: 'pass' | 'warn'; checks: { item: string; ok: boolean; note: string }[]; notes: string[] }
  | { type: 'revise'; id: string; status: 'start' | 'done' | 'error'; must_fix?: string[]; message?: string }
  | { type: 'skill_gap'; gaps: SkillGap[] }
  | { type: 'synthesis' }
  | { type: 'final'; data: Result; llm?: LlmInfo }
  | { type: 'error'; message: string };

export interface PoolSummary {
  total: number;
  clusters: Record<string, number>;
  mode: 'ai' | 'stub';
  max_experts: number;
  depths?: Record<Depth, number>; // 깊이별 인원 상한
  llm?: LlmInfo;
}

// 대화 한 번: 사용자의 요청과 Gon이 돌려준 진행 기록·결과
export interface Turn {
  id: number;
  conv?: number; // 대화 묶음. '새 대화'를 누르면 바뀐다(없으면 0)
  query: string;
  images: string[]; // 첨부한 이미지(data URL)
  feed: FeedItem[];
  answer?: string; // 스트리밍 중인 답(끝나면 result.final_content)
  route?: Route;
  interview?: InterviewState; // 요구사항 인터뷰 진행·결과
  result: Result | null;
  error: string | null;
  card: boolean;
  done: boolean;
}

export const toDesk = (e: Expert, i: number): DeskData => ({
  id: e.id,
  name: e.task || e.use_for,
  role_korean: e.name,
  character_name: e.name,
  badge_label: e.cluster_ko || '',
  accent: e.accent,
  desk_coord: { x: 0, y: i },
  description: e.use_for,
});
