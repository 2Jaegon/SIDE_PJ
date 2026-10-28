import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, Check, Users } from 'lucide-react';
import { Avatar } from './Avatar';

export interface ExpertItem {
  id: string;
  name: string;
  kind: string;
  cluster: string;
  cluster_ko: string;
  accent: string;
  use_for: string;
  triggers: string[];
  synergy: string[];
  guard?: string;
}

interface RosterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlotIndex: number | null;
  onSelectExpert: (expert: ExpertItem, slotIndex: number | null) => void;
  currentTeamIds: string[];
}

export const RosterDrawer: React.FC<RosterDrawerProps> = ({
  isOpen,
  onClose,
  targetSlotIndex,
  onSelectExpert,
  currentTeamIds,
}) => {
  const [experts, setExperts] = useState<ExpertItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && experts.length === 0) {
      setLoading(true);
      fetch('/api/office/experts')
        .then((res) => res.json())
        .then((data) => {
          setExperts(data.experts || []);
        })
        .catch((err) => console.error('Failed to load experts', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clusters = ['all', '기획', '개발', '글쓰기', '디자인', '리서치', '검증', '프롬프트', '보안·분석', '비주얼', '모션', '도구'];

  const filtered = experts.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.use_for.toLowerCase().includes(search.toLowerCase()) ||
      e.triggers.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCluster = selectedCluster === 'all' || e.cluster_ko === selectedCluster;
    return matchesSearch && matchesCluster;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in">
      <div className="w-full max-w-xl h-full bg-surface border-l border-line flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* 헤더 */}
        <header className="px-6 py-4 border-b border-line flex items-center justify-between shrink-0 bg-ground/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                전문가 인재풀 <span className="text-sm font-normal text-faint">({experts.length}명)</span>
              </h2>
              <p className="text-xs text-sub">
                {targetSlotIndex !== null
                  ? `데스크 ${targetSlotIndex + 1}에 출근시킬 전문가를 선택하세요`
                  : '사무실에 출근시킬 전문가를 선택해 팀을 구성하세요'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-sub hover:text-ink hover:bg-sunken transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 검색 및 카테고리 필터 */}
        <div className="p-4 border-b border-line space-y-3 bg-ground/30 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="전문가 직함, 역할, 키워드 검색..."
              className="w-full h-10 pl-9 pr-3 rounded border border-line bg-surface text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {clusters.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCluster(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCluster === c
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-line text-sub hover:text-ink'
                }`}
              >
                {c === 'all' ? '전체' : c}
              </button>
            ))}
          </div>
        </div>

        {/* 전문가 리스트 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-faint">인재풀을 불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-faint">일치하는 전문가가 없습니다.</div>
          ) : (
            filtered.map((e) => {
              const isAlreadyInTeam = currentTeamIds.includes(e.id);
              return (
                <div
                  key={e.id}
                  className={`p-3.5 rounded border transition-all ${
                    isAlreadyInTeam
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-line bg-surface hover:border-faint hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar accent={e.accent} name={e.name} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink">{e.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-sunken text-sub border border-line font-medium">
                            {e.cluster_ko}
                          </span>
                        </div>
                        <p className="text-xs text-sub mt-1 leading-5">{e.use_for}</p>

                        {/* 트리거 키워드 뱃지 */}
                        {e.triggers && e.triggers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {e.triggers.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-line text-faint"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectExpert(e, targetSlotIndex)}
                      className={`shrink-0 px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                        isAlreadyInTeam
                          ? 'bg-accent/15 text-accent hover:bg-accent/25'
                          : 'bg-accent text-white hover:bg-accent-hover'
                      }`}
                    >
                      {isAlreadyInTeam ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>배치됨</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>출근 배치</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
