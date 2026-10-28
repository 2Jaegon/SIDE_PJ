import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Lightbulb, Compass, RotateCcw, CheckCircle2 } from 'lucide-react';
import { ThinkingOrb } from './components/ThinkingOrb';
import { SkillBadge } from './components/SkillBadge';

interface Skill {
  id: string;
  name: string;
  badge_label: string;
  category: string;
  icon: string;
  description: string;
}

interface GenerateResponse {
  query: string;
  active_skills: Skill[];
  content: string;
  prompt_coach_tip: string;
}

export function App() {
  const [query, setQuery] = useState('');
  const [loadingState, setLoadingState] = useState<'idle' | 'searching' | 'solving' | 'completed'>('idle');
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [previewSkills, setPreviewSkills] = useState<Skill[]>([]);

  // 추천 샘플 쿼리
  const sampleQueries = [
    "동네 감성 카페 창업을 위한 인스타 홍보 카피와 오픈 이벤트 기획서 써줘",
    "소상공인 정책자금 신청을 위한 비즈니스 사업계획서 표준 규격으로 작성해줘",
    "실시간 채팅과 알림을 지원하는 가볍고 빠른 FastAPI 백엔드 아키텍처 코드",
    "Awwwards 수상작 느낌의 세련된 다크모드 미니멀 포트폴리오 웹 UI 기획"
  ];

  // 사용자가 타이핑할 때 실시간 스킬 탐색 프리뷰 (Debounce)
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setPreviewSkills([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        if (res.ok) {
          const data = await res.json();
          setPreviewSkills(data.active_skills || []);
        }
      } catch (err) {
        // 프리뷰 실패 시 조용히 무시
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoadingState('searching');
    setResult(null);

    try {
      // 1. 스킬 매칭 탐색 시뮬레이션
      await new Promise(r => setTimeout(r, 600));
      setLoadingState('solving');

      // 2. 실제 스킬 주입 결과 생성 API 호출
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!res.ok) throw new Error('생성에 실패했습니다.');

      const data: GenerateResponse = await res.json();
      setResult(data);
      setLoadingState('completed');
    } catch (err) {
      alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setLoadingState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. 상단 네비게이션 헤더 */}
      <header className="border-b border-slate-900/80 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              S
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-white">SkillBridge</span>
              <span className="text-[11px] ml-2 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                전국민 AI 평준화 엔진
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>비서 Gon 런타임 활성</span>
          </div>
        </div>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 flex flex-col items-center">
        {/* 헤드라인 & 소개 */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>프롬프트 잘 못 써도 괜찮습니다. AI가 스킬을 알아서 찾고 장착합니다.</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            1줄의 질문만으로, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              상위 1% 전문가의 결과물
            </span>을 만듭니다
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            요구사항을 입력하면 지식 그래프가 가장 적합한 기획·디자인·코드 스킬을 실시간으로 호출하여 결합합니다.
          </p>
        </div>

        {/* 3. 중앙 오르브 & 상태 표시 */}
        <div className="mb-6">
          <ThinkingOrb state={loadingState} size={56} />
        </div>

        {/* 4. 프롬프트 입력창 (Search Box) */}
        <div className="w-full relative mb-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="무엇을 만들거나 해결하고 싶으신가요? (예: 카페 인스타 홍보 카피, 사업계획서)"
              className="w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl px-5 py-4 pr-14 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 shadow-2xl transition-all duration-200"
            />
            <button
              type="submit"
              disabled={loadingState === 'searching' || loadingState === 'solving'}
              aria-label="질문 제출"
              className="absolute right-2.5 top-2.5 bottom-2.5 px-3.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 실시간 탐색된 스킬 프리뷰 뱃지 */}
          {previewSkills.length > 0 && loadingState === 'idle' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
                <Compass className="w-3 h-3 text-indigo-400" />
                자동 감지된 스킬:
              </span>
              {previewSkills.map((skill) => (
                <SkillBadge
                  key={skill.id}
                  id={skill.id}
                  name={skill.name}
                  badgeLabel={skill.badge_label}
                  category={skill.category}
                  icon={skill.icon}
                />
              ))}
            </div>
          )}
        </div>

        {/* 5. 샘플 쿼리 추천 칩 */}
        {loadingState === 'idle' && !result && (
          <div className="w-full space-y-2 mb-10">
            <span className="text-xs font-medium text-slate-500 block">이런 요청으로 시작해보세요:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sampleQueries.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(sample)}
                  className="text-left text-xs text-slate-400 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 px-3.5 py-2.5 rounded-xl transition-all duration-150 line-clamp-1"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. 결과물 렌더링 카드 */}
        {result && (
          <div className="w-full space-y-6 animate-in fade-in-50 duration-500">
            {/* 장착된 스킬 헤더 */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 mr-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  실행 적용된 스킬 체인:
                </span>
                {result.active_skills.map((skill) => (
                  <SkillBadge
                    key={skill.id}
                    id={skill.id}
                    name={skill.name}
                    badgeLabel={skill.badge_label}
                    category={skill.category}
                    icon={skill.icon}
                  />
                ))}
              </div>
              <button
                onClick={() => { setResult(null); setLoadingState('idle'); setQuery(''); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                새 질문
              </button>
            </div>

            {/* 본문 결과 카드 */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 shadow-xl leading-relaxed whitespace-pre-wrap font-sans text-sm sm:text-base">
              {result.content}
            </div>

            {/* 💡 AI 리터러시 사후 코칭 카드 (전국민 AI 평준화의 핵심!) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 border border-indigo-500/20 flex items-start gap-3.5 shadow-lg">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  AI 평준화 리터러시 코치 (Prompt Growth)
                </h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  {result.prompt_coach_tip}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 7. 하단 푸터 */}
      <footer className="border-t border-slate-900/80 py-6 text-center text-xs text-slate-600">
        <p>전국민 AI 평준화 플랫폼 (SkillBridge) · Powered by Gon Agent System</p>
      </footer>
    </div>
  );
}

export default App;

