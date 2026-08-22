import React from 'react';
import { NavItem } from './Sidebar';
import { cn } from '../../lib/utils';

interface MobileNavProps {
  navItems: NavItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  navItems,
  activeTab,
  setActiveTab
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 glass-panel border-t border-white/10 flex items-center justify-around px-2 z-40 lg:hidden">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 min-w-[64px] h-full transition-all duration-200 cursor-pointer',
            activeTab === item.id ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-400'
          )}
        >
          <div
            className={cn(
              'p-1.5 rounded-lg transition-all',
              activeTab === item.id && 'bg-indigo-50 dark:bg-indigo-950/40'
            )}
          >
            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 scale-75 origin-top">
            {item.label.split(' ')[0]}
          </span>
        </button>
      ))}
    </nav>
  );
};
