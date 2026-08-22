import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Sun, Moon, Search, Bell, BellOff, AlertCircle, Settings, LogOut 
} from 'lucide-react';
import { ITTicket, Priority, Status, SystemUser } from '../../types';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const safeFormat = (date: any, formatStr: string, fallback: string = '--') => {
  if (!date) return fallback;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
};

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentTabLabel?: string;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  pendingTicketsCount: number;
  pendingDailyKpiCount: number;
  isAdmin: boolean;
  tickets: ITTicket[];
  currentUser: any;
  userProfile: SystemUser | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isDarkMode,
  setIsDarkMode,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  currentTabLabel,
  isNotificationsOpen,
  setIsNotificationsOpen,
  pendingTicketsCount,
  pendingDailyKpiCount,
  isAdmin,
  tickets,
  currentUser,
  userProfile,
  onLogout
}) => {
  const activeTickets = tickets.filter(
    (t) => t.status === Status.PENDING || t.status === Status.IN_PROGRESS
  );
  const totalNotifications = pendingTicketsCount + (isAdmin && pendingDailyKpiCount > 0 ? 1 : 0);

  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-3 lg:gap-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
        <div className="hidden sm:block">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Inventory Management
          </p>
          <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 tracking-tight">
            {currentTabLabel}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Search */}
        <div className="relative hidden md:block group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-indigo-600"
            size={16}
          />
          <input
            type="text"
            placeholder="Search assets, tickets, specs (RAM/CPU)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-sm w-48 lg:w-64 outline-none text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                'relative p-2 transition-all rounded-xl cursor-pointer',
                isNotificationsOpen
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
              )}
            >
              <Bell size={20} />
              {totalNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-xs font-medium flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                  {totalNotifications}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm italic">
                      Notifications
                    </h3>
                    <button className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {isAdmin && pendingDailyKpiCount > 0 && (
                      <div
                        onClick={() => {
                          setActiveTab('daily-kpi');
                          setIsNotificationsOpen(false);
                        }}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-rose-50 dark:border-rose-950/30 border-l-4 border-l-rose-500"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-100 italic">
                            Missing Daily Logs
                          </p>
                          <span className="text-xs text-rose-500 font-medium bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-full">
                            ACTION REQUIRED
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle size={10} className="text-rose-500" />
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {pendingDailyKpiCount} Operational tasks remaining for today
                          </p>
                        </div>
                      </div>
                    )}
                    {activeTickets.length === 0 && pendingDailyKpiCount === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BellOff className="text-slate-300 dark:text-slate-600" size={24} />
                        </div>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          No active tickets
                        </p>
                      </div>
                    ) : (
                      activeTickets.slice(0, 5).map((ticket) => (
                        <div
                          key={ticket.id}
                          onClick={() => {
                            setActiveTab('tickets');
                            setIsNotificationsOpen(false);
                          }}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 border-l-4 border-l-transparent hover:border-l-indigo-600"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                              {ticket.problemType}
                            </p>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono italic">
                              {safeFormat(ticket.requestTime, 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded-[4px] text-xs font-medium',
                                ticket.priority === Priority.CRITICAL
                                  ? 'bg-rose-500 text-white'
                                  : ticket.priority === Priority.HIGH
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-200 text-slate-600 dark:text-slate-300'
                              )}
                            >
                              {ticket.priority}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {ticket.requesterName} • {ticket.requesterBranch}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('tickets');
                      setIsNotificationsOpen(false);
                    }}
                    className="w-full p-3 text-xs font-medium text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-t border-slate-50 bg-slate-50/50 cursor-pointer"
                  >
                    View all notifications
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                'p-2 transition-all rounded-xl cursor-pointer',
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
              )}
            >
              <Settings size={20} />
            </button>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-none">
              {currentUser?.displayName || 'User'}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {userProfile?.role || 'Staff'}
            </p>
          </div>
          <div className="relative group cursor-pointer">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="User"
                className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 group-hover:border-indigo-500 transition-all shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                {currentUser?.displayName?.charAt(0) || 'D'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
