import React from 'react';
import { Sidebar, NavItem } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { ITTicket, SystemUser } from '../../types';

interface AppShellProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navItems: NavItem[];
  accessLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  pendingTicketsCount: number;
  pendingDailyKpiCount: number;
  isAdmin: boolean;
  tickets: ITTicket[];
  currentUser: any;
  userProfile: SystemUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isMobile,
  isDarkMode,
  setIsDarkMode,
  activeTab,
  setActiveTab,
  navItems,
  accessLoading,
  searchTerm,
  setSearchTerm,
  isNotificationsOpen,
  setIsNotificationsOpen,
  pendingTicketsCount,
  pendingDailyKpiCount,
  isAdmin,
  tickets,
  currentUser,
  userProfile,
  onLogout,
  children
}) => {
  const currentTabLabel = navItems.find((i) => i.id === activeTab)?.label;

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Desktop & Mobile Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        navItems={navItems}
        accessLoading={accessLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Header */}
        <Header
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentTabLabel={currentTabLabel}
          isNotificationsOpen={isNotificationsOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          pendingTicketsCount={pendingTicketsCount}
          pendingDailyKpiCount={pendingDailyKpiCount}
          isAdmin={isAdmin}
          tickets={tickets}
          currentUser={currentUser}
          userProfile={userProfile}
          onLogout={onLogout}
        />

        {/* Dynamic Viewport */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <MobileNav
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
};
