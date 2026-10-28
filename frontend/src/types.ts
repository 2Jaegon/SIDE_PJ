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
}

export interface Result {
  mode: 'ai' | 'stub';
  query: string;
  plan_reason: string;
  experts: Expert[];
  agent_logs: Record<string, { name: string; status: string; log: string }>;
  final_content: string;
  prompt_coach_tip: string;
}

export type StreamEvent =
  | { type: 'start'; mode: 'ai' | 'stub'; lead: Expert }
  | { type: 'plan'; reason: string; experts: Expert[] }
  | { type: 'agent'; id: string; status: 'done' | 'error'; text: string }
  | { type: 'synthesis' }
  | { type: 'final'; data: Result }
  | { type: 'error'; message: string };

export interface PoolSummary {
  total: number;
  clusters: Record<string, number>;
  mode: 'ai' | 'stub';
  max_experts: number;
}

// 대화 한 번: 사용자의 요청과 Gon이 돌려준 진행 기록·결과
export interface Turn {
  id: number;
  query: string;
  feed: FeedItem[];
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
