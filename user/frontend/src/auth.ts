export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
  created_at?: string;
}

export interface AuthStatus {
  mode: string;
  is_supabase: boolean;
  has_placeholder: boolean;
  project_ref: string;
  message: string;
  host: string;
  google_client_id?: string;
  google_auth_configured?: boolean;
}

const TOKEN_KEY = 'gon_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch('/api/auth/status');
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return {
      mode: 'disconnected',
      is_supabase: false,
      has_placeholder: true,
      project_ref: 'wdnyhnfooqmqlgtrdshn',
      message: '서버와 연결할 수 없습니다.',
      host: 'aws-0-ap-northeast-2.pooler.supabase.com',
      google_client_id: '',
      google_auth_configured: false,
    };
  }
}

export async function loginApi(email: string, password: string): Promise<{ token: string; user: AuthUser; status: AuthStatus }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || '로그인에 실패했습니다.');
  }
  setStoredToken(data.token);
  return data;
}

export async function signupApi(email: string, password: string, name?: string): Promise<{ token: string; user: AuthUser; status: AuthStatus }> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || '회원가입에 실패했습니다.');
  }
  setStoredToken(data.token);
  return data;
}

export async function googleLoginApi(payload: {
  credential?: string;
  email?: string;
  name?: string;
  picture?: string;
}): Promise<{ token: string; user: AuthUser; status: AuthStatus }> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Google 로그인에 실패했습니다.');
  }
  setStoredToken(data.token);
  return data;
}

export async function getMeApi(): Promise<{ user: AuthUser; status: AuthStatus } | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // 토큰이 거절됐을 때만 지운다. 서버 재시작 중의 502·500으로 로그아웃되지 않게 한다
      if (res.status === 401 || res.status === 403) setStoredToken(null);
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  setStoredToken(null);
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore network error on logout
  }
}
