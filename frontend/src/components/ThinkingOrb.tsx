import React from 'react';

interface ThinkingOrbProps {
  state: 'idle' | 'searching' | 'solving' | 'completed';
  size?: number;
}

export const ThinkingOrb: React.FC<ThinkingOrbProps> = ({ state, size = 64 }) => {
  const getColors = () => {
    switch (state) {
      case 'searching':
        return 'from-cyan-400 via-blue-500 to-indigo-600';
      case 'solving':
        return 'from-violet-400 via-purple-500 to-pink-600 animate-spin';
      case 'completed':
        return 'from-emerald-400 via-teal-500 to-indigo-500';
      default:
        return 'from-slate-600 via-slate-700 to-slate-800';
    }
  };

  const getLabel = () => {
    switch (state) {
      case 'searching':
        return '스킬 지식 그래프 탐색 중...';
      case 'solving':
        return '전문가 스킬 체인 실행 중...';
      case 'completed':
        return '최상위 스킬 적용 완료';
      default:
        return '준비 완료';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* 외부 글로우 효과 */}
        <div 
          className={`absolute inset-0 rounded-full bg-gradient-to-tr ${getColors()} blur-xl opacity-50 ${state !== 'idle' ? 'animate-pulse' : ''}`}
        />
        {/* 내부 오르브 코어 */}
        <div 
          className={`relative rounded-full bg-gradient-to-tr ${getColors()} shadow-2xl flex items-center justify-center transition-all duration-500 border border-white/20`}
          style={{ width: size, height: size }}
        >
          <div className="w-1/3 h-1/3 rounded-full bg-white/40 blur-[2px]" />
        </div>
      </div>
      {state !== 'idle' && (
        <span className="text-xs font-medium text-slate-400 animate-pulse tracking-wide">
          {getLabel()}
        </span>
      )}
    </div>
  );
};

