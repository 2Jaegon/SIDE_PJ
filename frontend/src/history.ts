import { getStoredToken } from './auth';
import type { Result } from './types';
import type { FeedItem } from './components/ActivityFeed';

export interface HistoryItem {
  id: string;
  user_id?: string;
  query: string;
  result: Result | null;
  feed: FeedItem[];
  created_at?: string;
}

const authHeader = (): HeadersInit => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchHistoryApi(): Promise<HistoryItem[]> {
  try {
    const res = await fetch('/api/history', {
      headers: authHeader(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveHistoryTurnApi(query: string, result: Result | null, feed: FeedItem[] = []): Promise<string | null> {
  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(),
      },
      body: JSON.stringify({
        query,
        result,
        feed,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch {
    return null;
  }
}

export async function clearHistoryApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/history', {
      method: 'DELETE',
      headers: authHeader(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteHistoryTurnApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/history/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    return res.ok;
  } catch {
    return false;
  }
}
