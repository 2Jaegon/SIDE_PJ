import React from 'react';
import { 
  Briefcase, 
  Sparkles, 
  Palette, 
  Code, 
  ShieldCheck, 
  MessageSquare, 
  Layers 
} from 'lucide-react';

interface SkillBadgeProps {
  id: string;
  name: string;
  badgeLabel: string;
  category: string;
  icon?: string;
  active?: boolean;
}

export const SkillBadge: React.FC<SkillBadgeProps> = ({ 
  name, 
  badgeLabel, 
  icon,
  active = true 
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'briefcase': return <Briefcase className="w-3.5 h-3.5 text-blue-400" />;
      case 'sparkles': return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
      case 'palette': return <Palette className="w-3.5 h-3.5 text-purple-400" />;
      case 'code': return <Code className="w-3.5 h-3.5 text-emerald-400" />;
      case 'shield-check': return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
      case 'message-square': return <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />;
      default: return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition-all duration-300 ${
      active 
        ? 'bg-slate-900/80 border-indigo-500/40 text-slate-200 shadow-sm shadow-indigo-500/10' 
        : 'bg-slate-950/40 border-slate-800 text-slate-500'
    }`}>
      {getIcon()}
      <span className="font-semibold text-white">{badgeLabel}</span>
      <span className="text-slate-400 text-[11px] hidden sm:inline">({name})</span>
    </div>
  );
};
