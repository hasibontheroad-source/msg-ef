import React from 'react';
import { MessageSquare, Radar, Radio, KeyRound, Sparkles } from 'lucide-react';

export type NavTab = 'comms' | 'radar' | 'radio' | 'vault' | 'ai';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  packetCount: number;
  nodeCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  packetCount,
  nodeCount,
}) => {
  const tabs = [
    {
      id: 'comms' as NavTab,
      label: 'COMMS',
      icon: MessageSquare,
      badge: packetCount > 0 ? packetCount : undefined,
    },
    {
      id: 'radar' as NavTab,
      label: 'MESH RADAR',
      icon: Radar,
      badge: nodeCount > 0 ? `${nodeCount} NODES` : undefined,
    },
    {
      id: 'radio' as NavTab,
      label: 'RADIO & HARDWARE',
      icon: Radio,
    },
    {
      id: 'vault' as NavTab,
      label: 'E2EE VAULT',
      icon: KeyRound,
    },
    {
      id: 'ai' as NavTab,
      label: 'TACTICAL AI',
      icon: Sparkles,
      highlight: true,
    },
  ];

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950/80 px-2 sm:px-4 py-2 sticky top-[57px] z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTab(t.id)}
              aria-label={t.label}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
              } ${t.highlight && !isActive ? 'text-amber-400/90 hover:text-amber-300' : ''}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} />
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-emerald-500/30 text-emerald-200 font-bold'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
