import React, { useState, useEffect } from 'react';
import { X, Search, Check, Users } from 'lucide-react';
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const clusters = ['all', '기획', '개발', '글쓰기', '디자인', '리서치', '검증', '프롬프트', '보안·분석', '비주얼', '모션', '도구'];

  const filtered = experts.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.use_for.toLowerCase().includes(search.toLowerCase());
    const matchesCluster = selectedCluster === 'all' || e.cluster_ko === selectedCluster;
    return matchesSearch && matchesCluster;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="전문가 고르기"
        onClick={(e) => e.stopPropagation()}
        className="anim-slide w-full max-w-xl h-full bg-surface border-l border-line flex flex-col"
      >
        {/* 헤더 */}
        <header className="px-5 py-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-accent-soft flex items-center justify-center text-accent">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                전문가 고르기 <span className="text-sm font-normal text-faint">({experts.length}명)</span>
              </h2>
              <p className="text-sm text-sub">
                {targetSlotIndex !== null
                  ? `${targetSlotIndex + 1}번 자리에 앉힐 전문가를 고르세요`
                  : '직접 고르면 Gon의 자동 편성 대신 이 팀이 일해요'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded text-sub hover:text-ink hover:bg-sunken transition-colors duration-200 ease-out"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 검색 및 카테고리 필터 */}
        <div className="p-4 border-b border-line space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="전문가 이름이나 하는 일로 찾기"
              className="w-full h-10 pl-9 pr-3 rounded border border-line bg-surface text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {clusters.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCluster(c)}
                className={`h-8 px-3 rounded-full text-sm whitespace-nowrap transition-colors duration-200 ease-out ${
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
            <div className="py-12 text-center text-sm text-faint">전문가 목록을 불러오는 중이에요</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-faint">찾는 전문가가 없어요.</div>
          ) : (
            filtered.map((e) => {
              const isAlreadyInTeam = currentTeamIds.includes(e.id);
              return (
                <div
                  key={e.id}
                  className={`p-3.5 rounded-lg border transition-colors duration-200 ease-out ${
                    isAlreadyInTeam ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-faint'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar accent={e.accent} name={e.name} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink">{e.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sunken text-sub">
                            {e.cluster_ko}
                          </span>
                        </div>
                        <p className="text-sm text-sub mt-1 leading-5">{e.use_for}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectExpert(e, targetSlotIndex)}
                      className={`shrink-0 h-9 px-3 rounded text-sm font-medium inline-flex items-center gap-1 transition-colors duration-200 ease-out ${
                        isAlreadyInTeam ? 'bg-surface border border-accent text-accent' : 'bg-accent text-white hover:bg-accent-hover'
                      }`}
                    >
                      {isAlreadyInTeam ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>고름</span>
                        </>
                      ) : (
                        <>
                          <span>고르기</span>
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
