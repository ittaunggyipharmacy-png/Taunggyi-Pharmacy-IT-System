import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: number;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navItems: NavItem[];
  accessLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isMobile,
  activeTab,
  setActiveTab,
  navItems,
  accessLoading
}) => {
  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? 280 : (isSidebarOpen ? 280 : 80),
          x: isMobile ? (isSidebarOpen ? 0 : -280) : 0
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 fixed inset-y-0 left-0 lg:relative lg:translate-x-0 shadow-sm"
      >
        <div
          className={cn(
            'h-20 px-6 flex items-center shrink-0 border-b border-slate-100 dark:border-slate-800',
            isSidebarOpen ? 'justify-between' : 'justify-center'
          )}
        >
          <AnimatePresence mode="wait">
            {isSidebarOpen ? (
              <motion.div
                key="logo-open"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <Box size={20} />
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                  managez.<br />
                  <span className="text-slate-400 dark:text-slate-500 font-medium text-xs">
                    Powered by Lex Corp.
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="logo-closed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white"
              >
                <Box size={24} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-3 overflow-y-auto sidebar-scroll">
          {accessLoading ? (
            <div className="px-4 py-3.5 space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse shrink-0" />
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isSidebarOpen ? 1 : 0,
                      width: isSidebarOpen ? 'auto' : 0
                    }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                    className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24 animate-pulse"
                  />
                </div>
              ))}
            </div>
          ) : (
            navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile) {
                    setIsSidebarOpen(false);
                  }
                }}
                className={cn(
                  'w-full min-h-11 flex items-center px-3 py-2.5 rounded-xl transition-colors duration-200 group text-left relative',
                  isSidebarOpen ? 'gap-4 justify-start' : 'gap-0 justify-center',
                  activeTab === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:text-white dark:hover:text-slate-100'
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    'shrink-0',
                    activeTab === item.id
                      ? 'text-indigo-600'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-300'
                  )}
                />

                <motion.span
                  initial={false}
                  animate={{
                    opacity: isSidebarOpen ? 1 : 0,
                    width: isSidebarOpen ? 'auto' : 0,
                    marginLeft: isSidebarOpen ? 0 : -10
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}
                  className="text-sm font-semibold tracking-tight"
                >
                  {item.label}
                </motion.span>

                {item.badge !== undefined && (
                  <div
                    className={cn(
                      'ml-auto flex items-center justify-center rounded-full bg-rose-500 text-xs font-medium text-white transition-all duration-200',
                      isSidebarOpen
                        ? 'px-1.5 py-0.5 min-w-[1.2rem]'
                        : 'absolute top-2 right-2 w-4 h-4 shadow-sm'
                    )}
                  >
                    {isSidebarOpen ? item.badge : ''}
                  </div>
                )}
                {!isSidebarOpen && activeTab === item.id && (
                  <div className="absolute right-0 w-1 h-6 bg-indigo-600 rounded-l" />
                )}
              </button>
            ))
          )}
        </nav>

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="p-6 bg-slate-50/50 dark:bg-slate-800/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Activity size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                    Overall usage 45% (51 °C)
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    23 Dec 2020, 6:00 pm
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
};
