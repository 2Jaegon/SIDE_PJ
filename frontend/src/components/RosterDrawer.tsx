import React, { useState } from 'react';
import { X, Search, Check, Users, Plus } from 'lucide-react';

export interface AgentTemplate {
  id: string;
  name: string;
  character: string;
  accent: string;
  role: string;
  goal: string;
  capabilities: string[];
  category: string;
  description: string;
}

interface RosterDrawerProps {
  isOpen: boolean;
  templates: AgentTemplate[];
  currentTeamIds: string[];
  targetSlotIndex?: number | null;
  onClose: () => void;
  onSelectAgentForSlot: (agentId: string, slotIndex: number) => void;
}

export const RosterDrawer: React.FC<RosterDrawerProps> = ({
  isOpen,
  templates,
  currentTeamIds,
  targetSlotIndex = null,
  onClose,
  onSelectAgentForSlot,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeSlot, setActiveSlot] = useState<number>(targetSlotIndex ?? 0);

  if (!isOpen) return null;

  const categories = ['All', 'Engineering', 'Design & Creative', 'Marketing & Sales', 'Product & Strategy', 'Operations & Legal'];

  const filtered = templates.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.character.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.capabilities.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const getAccentGradient = (accent: string) => {
    switch (accent) {
      case 'peach': return 'from-orange-400 to-amber-500';
      case 'mint': return 'from-emerald-400 to-teal-500';
      case 'lavender': return 'from-purple-400 to-indigo-500';
      case 'rose': return 'from-rose-400 to-pink-500';
      case 'amber': return 'from-amber-400 to-yellow-500';
      default: return 'from-indigo-400 to-blue-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#090b14] border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* 1. 상단 타이틀 바 */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>36개 공식 에이전트 인재풀 (Agent Roster)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {templates.length}명
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                원하는 전문가를 클릭하여 가상 오피스 데스크에 출근시키세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. 현재 오피스 5개 슬롯 상태 바 */}
        <div className="px-6 py-3.5 bg-slate-950/70 border-b border-slate-800/80">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
            배치할 데스크 슬롯 선택 (Target Desk Slot):
          </span>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const currentId = currentTeamIds[slotIdx];
              const agent = templates.find((t) => t.id === currentId);
              const isSelectedSlot = activeSlot === slotIdx;

              return (
                <button
                  key={slotIdx}
                  onClick={() => setActiveSlot(slotIdx)}
                  className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelectedSlot
                      ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>데스크 {slotIdx + 1}</span>
                    {isSelectedSlot && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />}
                  </div>
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {agent ? agent.name : '비어있음'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 검색 및 카테고리 필터 */}
        <div className="p-6 pb-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="직무명, 캐릭터 이름, 역량 키워드로 검색 (예: 보안, SEO, Jim, 모바일)"
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 4. 에이전트 목록 스크롤 뷰 */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2.5">
          {filtered.map((agent) => {
            const isCurrentlyInTeam = currentTeamIds.includes(agent.id);

            return (
              <div
                key={agent.id}
                onClick={() => onSelectAgentForSlot(agent.id, activeSlot)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 group ${
                  isCurrentlyInTeam
                    ? 'bg-slate-900/40 border-slate-800/80 hover:border-indigo-500/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-indigo-400 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAccentGradient(agent.accent)} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md`}>
                    {agent.character[0].toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {agent.name}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        {agent.character.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        · {agent.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal line-clamp-2">
                      {agent.description}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {agent.capabilities.slice(0, 3).map((cap, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1 transition-all ${
                    isCurrentlyInTeam
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20'
                  }`}
                >
                  {isCurrentlyInTeam ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>출근 중</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>데스크 {activeSlot + 1} 배치</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 5. 하단 닫기 */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition-colors"
          >
            오피스로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};
