import React, { useState, useEffect, useRef } from 'react';
import { AccretionDisc } from './AccretionDisc';
import { Mark } from './Mark';
import { Eye, EyeOff, Database, AlertCircle, Loader2, X, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { loginApi, signupApi, googleLoginApi, getAuthStatus, AuthUser, AuthStatus } from '../auth';

interface LoginPageProps {
  onAuthSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus | null>(null);

  // Google 로그인 모달 (Client ID 미설정 로컬 개발 환경용)
  const [showGoogleDevModal, setShowGoogleDevModal] = useState(false);
  const [devGoogleEmail, setDevGoogleEmail] = useState('');
  const [devGoogleName, setDevGoogleName] = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAuthStatus().then(setStatus);
  }, []);

  const clientId = status?.google_client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Google Identity Services (GIS) 스크립트 로드 및 버튼 렌더링
  useEffect(() => {
    if (!clientId) return;

    const scriptId = 'google-gsi-client';
    const renderGoogle = () => {
      initGoogleGsi(clientId);
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderGoogle;
      document.body.appendChild(script);
    } else {
      renderGoogle();
    }
  }, [clientId]);

  const initGoogleGsi = (cid: string) => {
    const win = window as any;
    if (win.google?.accounts?.id) {
      try {
        win.google.accounts.id.initialize({
          client_id: cid,
          callback: async (response: any) => {
            if (response?.credential) {
              await handleGoogleCredential(response.credential);
            }
          },
          auto_select: false,
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          win.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: googleBtnRef.current.offsetWidth || 340,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        }
      } catch (err) {
        console.warn('Google GSI 초기화 경고:', err);
      }
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleLoginApi({ credential });
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || 'Google 로그인 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    const win = window as any;

    if (clientId && win.google?.accounts?.id) {
      win.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setShowGoogleDevModal(true);
        }
      });
    } else {
      setShowGoogleDevModal(true);
    }
  };

  const handleGoogleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devGoogleEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await googleLoginApi({
        email: devGoogleEmail,
        name: devGoogleName || devGoogleEmail.split('@')[0],
        picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(devGoogleEmail)}`,
      });
      setShowGoogleDevModal(false);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || 'Google 로그인 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await loginApi(email, password);
        onAuthSuccess(res.user);
      } else {
        const res = await signupApi(email, password, name);
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err?.message || '인증에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#0c0a08] text-white font-sans flex flex-col lg:flex-row overflow-hidden selection:bg-[#d97757]/30 selection:text-white">
      {/* 1. 좌측 사이드: 3D Accretion Disc (강착원반 전용 스테이지 - 사이드로 배치하여 100% 가림 없이 독립 회전 감상) */}
      <div className="relative w-full lg:w-1/2 xl:w-7/12 h-64 sm:h-80 lg:h-auto min-h-[260px] lg:min-h-dvh flex items-center justify-center bg-[#070605] border-b lg:border-b-0 lg:border-r border-[#201c18]/80 overflow-hidden">
        {/* 강착원반 캔버스 (마우스와 무관하게 자율 독립 회전) */}
        <AccretionDisc className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* 부드러운 우주 대기 비네트 그라디언트 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(12, 10, 8, 0.1) 0%, rgba(7, 6, 5, 0.6) 70%, #070605 100%)',
          }}
          aria-hidden="true"
        />

        {/* 데스크톱 우측 연결선 그라디언트 페이드 */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#0c0a08] pointer-events-none" />
      </div>

      {/* 2. 우측 사이드: 인증 폼 카드 (가려지지 않고 선명한 레이아웃) */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex items-center justify-center p-4 sm:p-8 lg:p-12 z-10 overflow-y-auto">
        <div className="w-full max-w-[420px] anim-rise space-y-5 my-auto">
          {/* 상단 심볼: 새 공식 로고 */}
          <div className="flex justify-center mb-1">
            <div className="p-1.5 rounded-2xl bg-[#141210] border border-[#d97757]/30 shadow-[0_0_25px_rgba(201,164,90,0.2)]">
              <Mark size={48} className="rounded-xl" />
            </div>
          </div>

          {/* 메인 인증 글래스 카드 (Dark Room & Warm Black, Gold) */}
          <div className="bg-[#141210]/95 backdrop-blur-xl rounded-2xl border border-[#d97757]/25 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          {/* 탭 전환 (로그인 / 회원가입) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0a0807] rounded-xl border border-[#231f1a] mb-6" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`py-2 text-xs sm:text-sm font-medium rounded-lg text-center transition-all duration-200 ${
                tab === 'login'
                  ? 'bg-[#1e1a16] text-[#d97757] border border-[#d97757]/40 shadow-xs font-semibold'
                  : 'text-[#857f76] hover:text-white'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'signup'}
              onClick={() => {
                setTab('signup');
                setError(null);
              }}
              className={`py-2 text-xs sm:text-sm font-medium rounded-lg text-center transition-all duration-200 ${
                tab === 'signup'
                  ? 'bg-[#1e1a16] text-[#d97757] border border-[#d97757]/40 shadow-xs font-semibold'
                  : 'text-[#857f76] hover:text-white'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* 에러 피드백 */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 anim-rise"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" aria-hidden />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Google 공식 소셜 로그인 버튼 */}
          {clientId ? (
            <div className="w-full flex justify-center py-0.5">
              <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" style={{ colorScheme: 'light' }} /> {/* 구글 버튼 iframe은 페이지와 색 구성이 다르면 흰 바탕이 깔린다 */}
            </div>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleClick}
              className="w-full h-11 rounded-xl border border-[#2d2822] bg-[#1a1714] hover:bg-[#231f1a] hover:border-[#d97757]/40 text-sm font-medium text-white inline-flex items-center justify-center gap-3 transition-all duration-200 ease-out active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google 계정으로 계속하기</span>
            </button>
          )}

          {/* 구분선 */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#231f1a]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#141210] px-2.5 text-[#857f76]">또는 이메일로 계속하기</span>
            </div>
          </div>

          {/* 이메일 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label htmlFor="name-input" className="block text-xs sm:text-sm font-medium text-[#b5afa6] mb-1.5">
                  이름 또는 닉네임 (선택)
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#2d2822] bg-[#0c0a08]/90 text-sm text-white placeholder-[#5a544b] focus:outline-none focus:ring-1 focus:ring-[#d97757] focus:border-[#d97757] transition-all duration-200"
                />
              </div>
            )}

            <div>
              <label htmlFor="email-input" className="block text-xs sm:text-sm font-medium text-[#b5afa6] mb-1.5">
                이메일 주소
              </label>
              <input
                id="email-input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 px-3.5 rounded-xl border border-[#2d2822] bg-[#0c0a08]/90 text-sm text-white placeholder-[#5a544b] focus:outline-none focus:ring-1 focus:ring-[#d97757] focus:border-[#d97757] transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password-input" className="block text-xs sm:text-sm font-medium text-[#b5afa6] mb-1.5">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? '최소 6자 이상' : '비밀번호 입력'}
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[#2d2822] bg-[#0c0a08]/90 text-sm text-white placeholder-[#5a544b] focus:outline-none focus:ring-1 focus:ring-[#d97757] focus:border-[#d97757] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#857f76] hover:text-white p-1.5 rounded transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 골드 시그니처 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 rounded-xl bg-[#d97757] text-white text-sm font-semibold hover:bg-[#c15f3c] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_2px_14px_rgba(217,119,87,0.28)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0c0a08]" aria-hidden />
                  <span>{tab === 'login' ? '로그인 중...' : '가입 처리 중...'}</span>
                </>
              ) : (
                <span>{tab === 'login' ? '로그인' : '계정 만들기'}</span>
              )}
            </button>
          </form>
        </div>

        {/* 하단 시스템 인프라 현황 바 (Supabase Cloud + Google OAuth 상태) */}
        <div className="p-3.5 rounded-xl bg-[#120f0d]/80 border border-[#231f1a] backdrop-blur-md text-xs text-[#857f76] space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-white font-medium">
              <Database className="w-3.5 h-3.5 text-[#d97757]" />
              <span>클라우드 인프라 연동 현황</span>
            </span>
            {status?.is_supabase ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Supabase 연결됨
              </span>
            ) : status?.mode === 'disconnected' ? (
              <span className="text-[11px] text-red-400 font-medium">서버에 연결할 수 없어요</span>
            ) : (
              <span className="text-[11px] text-[#857f76]">로컬 SQLite 모드</span>
            )}
          </div>
          <div className="text-[11px] text-[#857f76] flex items-center justify-between">
            <span>Google 공식 OAuth</span>
            {status?.google_auth_configured ? (
              <span className="text-[#d97757] font-medium inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                활성화됨
              </span>
            ) : status?.mode === 'disconnected' ? (
              <span>서버 연결 후 확인돼요</span>
            ) : (
              <span>Client ID 미설정</span>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Google OAuth 연동 안내 및 체험 모달 */}
      {showGoogleDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm anim-rise">
          <div className="w-full max-w-md bg-[#161412] rounded-2xl border border-[#d97757]/30 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a241e]">
              <div className="inline-flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="text-sm font-semibold text-white">Google 로그인 연동 안내</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleDevModal(false)}
                className="p-1.5 rounded-lg text-[#857f76] hover:text-white hover:bg-[#231f1a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 계정 미표시 원인 설명 */}
            <div className="p-3.5 rounded-xl bg-[#0c0a08] border border-[#2a241e] text-xs text-[#9e988f] leading-relaxed space-y-1.5">
              <div className="font-medium text-white flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#d97757] shrink-0" />
                <span>등록된 내 구글 계정 팝업이 바로 안 뜬 이유</span>
              </div>
              <p>
                Google의 보안 정책(OAuth 2.0)상, 사전 등록된 클라이언트 ID가 없으면 브라우저에 저장된 사용자의 구글 계정 정보를 읽어오거나 팝업을 띄우는 것이 원천 차단됩니다.
              </p>
              <p className="text-[11px] text-[#706a61]">
                현재 프로젝트는 백엔드 Google ID Token 검증 및 Supabase PostgreSQL 연동이 완료되어 있습니다.
              </p>
            </div>

            {/* 1분 연동 방법 안내 */}
            <div className="space-y-1.5 text-xs">
              <span className="font-medium text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#d97757]" />
                <span>실제 내 구글 계정 팝업 연동하기 (1분)</span>
              </span>
              <ol className="text-[#9e988f] space-y-1.5 list-decimal pl-4 leading-normal text-[11px]">
                <li>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline font-medium inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                  에서 <strong>OAuth 클라이언트 ID</strong> (웹 애플리케이션) 생성
                </li>
                <li>
                  <strong>승인된 자바스크립트 원본</strong>에 <code className="px-1.5 py-0.5 bg-[#0c0a08] rounded text-[#d97757] border border-[#2a241e]">http://localhost:5173</code> 등록
                </li>
                <li>
                  발급받은 ID를 <code className="text-white">backend/.env</code>의 <code className="text-[#d97757]">GOOGLE_CLIENT_ID=</code>에 붙여넣기
                </li>
              </ol>
            </div>

            {/* 설정 없이 바로 테스트하는 폼 */}
            <div className="pt-3 border-t border-[#2a241e] space-y-2.5">
              <span className="text-xs font-medium text-white block">
                설정 전 먼저 둘러보기 (체험 모드)
              </span>
              <form onSubmit={handleGoogleDevSubmit} className="space-y-2.5">
                <input
                  type="email"
                  required
                  value={devGoogleEmail}
                  onChange={(e) => setDevGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full h-9 px-3 rounded-xl border border-[#2d2822] bg-[#0c0a08] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d97757] focus:border-[#d97757]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDevGoogleEmail('demo.user@gmail.com');
                      setDevGoogleName('구글 체험자');
                    }}
                    className="flex-1 h-9 rounded-xl border border-[#2d2822] bg-[#1a1714] hover:bg-[#231f1a] text-xs font-medium text-[#d97757] inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#d97757]" />
                    <span>데모 계정 입력</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !devGoogleEmail}
                    className="flex-1 h-9 rounded-xl bg-[#d97757] text-[#0c0a08] text-xs font-semibold hover:bg-[#dfb86c] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0c0a08]" /> : <span>계속하기</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
