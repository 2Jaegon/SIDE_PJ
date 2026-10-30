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
}

export type Route = 'team' | 'direct';
export type Lens = 'dev' | 'service'; // 개발자 관점 / 서비스 관점
export type Depth = 'fast' | 'normal' | 'deep'; // 팀 인원 상한: 빠르게 / 보통 / 깊게

// 연결된 AI. images: 첨부 이미지를 실제로 볼 수 있는지
export interface ModelOption {
  id: string; // '' = 연결된 AI의 기본 모델
  label: string;
  note?: string;
}

export interface LlmInfo {
  kind: string | null;
  label: string;
  images: boolean;
  image_label?: string;
  fallback?: { from: string; until: number };
  models?: ModelOption[]; // 첫 번째가 기본값. 비어 있으면 고를 수 없다
}

export interface Result {
  mode: 'ai' | 'stub';
  route?: Route;
  query: string;
  intent?: string;
  plan_reason: string;
  sub_questions?: string[];
  experts: Expert[];
  agent_logs: Record<string, { name: string; status: string; log: string; sub_question?: string }>;
  final_content: string;
  prompt_coach_tip: string;
}

export type StreamEvent =
  | { type: 'start'; mode: 'ai' | 'stub'; lead: Expert; llm?: LlmInfo }
  | { type: 'plan'; route?: Route; reason: string; intent?: string; sub_questions?: string[]; experts: Expert[]; llm?: LlmInfo }
  | { type: 'delta'; text: string }
  | { type: 'agent'; id: string; status: 'done' | 'error'; text: string }
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
