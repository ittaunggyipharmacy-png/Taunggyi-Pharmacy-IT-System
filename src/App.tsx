import React, { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldOff, LayoutDashboard, Ticket as TicketIcon, Monitor, ShieldCheck, Megaphone, HardDrive, Settings, HelpCircle, Activity, Users, FileText, Briefcase, Calendar, FolderClock, Printer } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth, LoginScreen, LoadingScreen } from './features/auth';
import { AppShell } from './components/layout';
import { useAccessControl } from './contexts/AccessControlContext';
import { ConfirmationModal } from './components/ConfirmationModal';
import { Dashboard } from './features/dashboard/Dashboard';
import { AssetsModule, AssetUsersPage } from './features/assets';
import { SettingsModule } from './features/settings';
import { SkillsModule, SkillMatrix } from './features/skills';
import { ReportsModule } from './features/reports';
import { SecurityModule } from './features/security';
import { PurchasesModule } from './features/purchases';
import { MarketingModule } from './features/marketing';
import { FileManagerModule } from './features/file-manager';
import { RenewalsModule } from './features/renewals';
import { KPIDashboard, KPITracker } from './features/kpi';
import { MeetingMinutesModule } from './features/meetings';
import { IdLayoutGenerator } from './features/id-layout';
import { TicketsModule } from './features/tickets';
import { HelpSupportModule } from './components/HelpSupportModule';
import { Status, ITTicket, ITAsset, BackupLog, BackupSchedule, ContentPlan, CCTVRequest, RenewalRecord, PurchaseRecord, SystemSettings, ActivityEntry, TaskEvidence, DailyLog, EmployeeProfile, UserRole } from './types';
import { subscribeToTickets } from './services/ticketService';
import { subscribeToSync, subscribeToSupervisorFeatures } from './services/syncService';
import { getSettings } from './services/settingsService';

if (typeof window !== 'undefined' && window.opener && window.location.hash.includes('access_token')) {
  setTimeout(() => {
    window.opener.postMessage({ type: 'SUPABASE_AUTH_COMPLETED', hash: window.location.hash }, '*');
    window.close();
  }, 1500);
}

if (typeof window !== 'undefined' && !window.opener) {
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SUPABASE_AUTH_COMPLETED') {
      const hash = event.data.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    } else if (event.data === 'SUPABASE_AUTH_COMPLETED') {
      await supabase.auth.getSession();
    }
  });
}

const INITIAL_SETTINGS: SystemSettings = { departments: [], locations: [], itContacts: [], branchNotes: [] };
const INITIAL_SCHEDULE: BackupSchedule[] = [
  { id: 'SCH-001', time: '09:00', type: 'Cloud Storage', label: 'Morning Cloud Sync' },
  { id: 'SCH-002', time: '22:00', type: 'External Drive', label: 'Nightly Physical Backup' },
];

type ActiveTab = 'dashboard' | 'tickets' | 'assets' | 'asset-users' | 'security' | 'marketing' | 'renewals' | 'purchases' | 'files' | 'settings' | 'help' | 'kpi' | 'daily-kpi' | 'reports' | 'skills' | 'users' | 'meetings' | 'id-layout';

export default function App() {
  const { canAccess, loading: accessLoading } = useAccessControl();
  const { currentUser, userProfile, isAdmin, authReady, login, loginWithCredentials, logout } = useAuth();
  const [confirmTarget, setConfirmTarget] = useState<{ id: string, onConfirm: () => void, message: string, title?: string, confirmText?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
  const [allDailyLogs, setAllDailyLogs] = useState<DailyLog[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [quota, setQuota] = useState<{limit: string, usage: string} | null>(null);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [contentPlans, setContentPlans] = useState<ContentPlan[]>([]);
  const [cctvRequests, setCctvRequests] = useState<CCTVRequest[]>([]);
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [reminders, setReminders] = useState<{id: string, message: string, type: 'urgent' | 'info'}[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const pendingTicketsCount = tickets.filter(t => t.status === Status.PENDING || t.status === Status.IN_PROGRESS).length;
  const pendingDailyKpiCount = useMemo(() => {
    if (!currentUser) return 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayLog = allDailyLogs.find(l => l.date === today && l.userId === currentUser.id);
    const dailyTaskIds = ['it_uptime', 'it_maint', 'it_support', 'it_backup', 'it_access', 'it_asset', 'merch_stock', 'merch_promo', 'merch_visit', 'mkt_photos', 'mkt_drive', 'mkt_inquiry'];
    if (!todayLog) return dailyTaskIds.length;
    let incomplete = 0;
    dailyTaskIds.forEach(id => {
      const completion = todayLog.tasks[id];
      if (id === 'mkt_photos' ? (Number(completion) || 0) < 20 : !completion) incomplete++;
    });
    return incomplete;
  }, [allDailyLogs, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    getSettings().then(dbSettings => { if (dbSettings) setSettings(dbSettings); });
    const unsubTickets = subscribeToTickets(setTickets);
    const unsubSync = subscribeToSync({
      onPurchases: setPurchases,
      onAssets: setAssets,
      onAssetsError: (err: any) => { console.error('Asset load error:', err); toast.error('Unable to load assets'); },
      onBackups: setBackups,
      onCCTV: setCctvRequests,
      onPlans: setContentPlans,
      onRenewals: setRenewals
    });
    let unsubSupervisor = () => {};
    if (isAdmin) {
      unsubSupervisor = subscribeToSupervisorFeatures({
        onActivities: setActivities,
        onEvidence: setEvidence,
        onAllDailyLogs: setAllDailyLogs,
        onEmployees: setEmployees
      });
    }
    return () => { unsubTickets(); unsubSync(); unsubSupervisor(); };
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!accessLoading && userProfile && !isAdmin) {
      const allowedIds = ['tickets', 'dashboard', 'reports', 'kpi', 'daily-kpi', 'skills', 'assets', 'asset-users', 'purchases', 'renewals', 'security', 'marketing', 'files', 'settings', 'help', 'meetings']
        .filter(id => id === 'asset-users' ? canAccess(userProfile.role, 'assets') : canAccess(userProfile.role, id));
      if (!canAccess(userProfile.role, activeTab) && activeTab !== 'asset-users' && allowedIds.length > 0) setActiveTab(allowedIds[0] as ActiveTab);
      if (activeTab === 'asset-users' && !canAccess(userProfile.role, 'assets') && allowedIds.length > 0) setActiveTab(allowedIds[0] as ActiveTab);
    }
  }, [accessLoading, userProfile, isAdmin, canAccess, activeTab]);

  useEffect(() => {
    const checkSopReminders = () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      const dayOfWeek = now.getDay();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const isLastDayOfMonth = now.getDate() === lastDayOfMonth;
      const newReminders: {id: string, message: string, type: 'urgent' | 'info'}[] = [];
      if (currentHour >= 9 && currentHour < 12) {
        newReminders.push({ id: 'DAILY-1', message: 'CCTV Daily Check & Log entry required [SOP-G01]', type: 'info' });
        newReminders.push({ id: 'DAILY-2', message: 'Log new IT Support Requests to IT Support Log', type: 'info' });
      }
      if (dayOfWeek === 5) newReminders.push({ id: 'WEEKLY-1', message: 'Friday Check: Submit Weekly Progress Report to IT Supervisor', type: 'urgent' });
      if (isLastDayOfMonth) newReminders.push({ id: 'MONTHLY-1', message: 'Month End: Submit Asset Inventory & Backup Status to Management', type: 'urgent' });
      const unassignedCount = assets.filter(a => a.assignedTo === 'Unassigned').length;
      if (unassignedCount > 0) newReminders.push({ id: 'ASSET-1', message: `SOP Alert: ${unassignedCount} unassigned assets found. Please map to users.`, type: 'urgent' });
      const recentlyAssigned = assets.filter(a => a.assignedTo !== 'Unassigned' && a.purchaseRecordId);
      if (recentlyAssigned.length > 0) {
        const lastAsset = recentlyAssigned[0];
        newReminders.push({ id: `SYNC-${lastAsset.id}`, message: `Sync Alert: Asset ${lastAsset.model} has been assigned to ${lastAsset.assignedTo}. Purchase Record ${lastAsset.purchaseRecordId} updated.`, type: 'info' });
      }
      INITIAL_SCHEDULE.forEach(sch => {
        const hasBackup = backups.some(b => b.date === todayStr && b.status === 'Success' && ((sch.time === '09:00' && b.storageType === 'Cloud Storage') || (sch.time === '22:00' && b.storageType === 'External Drive')));
        if (!hasBackup) {
          if (currentTimeStr >= sch.time) newReminders.push({ id: sch.id, message: `URGENT: ${sch.label} is OVERDUE (${sch.time})`, type: 'urgent' });
          else {
            const [schH] = sch.time.split(':').map(Number);
            if (schH - currentHour <= 1 && schH - currentHour >= 0) newReminders.push({ id: sch.id, message: `Upcoming SOP Activity: ${sch.label} at ${sch.time}`, type: 'info' });
          }
        }
      });
      setReminders(newReminders);
    };
    checkSopReminders();
    const interval = setInterval(checkSopReminders, 60000);
    return () => clearInterval(interval);
  }, [backups, assets]);

  useEffect(() => {
    if (authReady && currentUser && !isAdmin) {
      const allowedTabs = ['tickets', 'assets', 'asset-users'];
      if (!allowedTabs.includes(activeTab) && allowedTabs.length > 0) {
        // Access is handled by the permission effect above.
      }
    }
  }, [authReady, currentUser, isAdmin, activeTab]);

  if (!authReady) return <LoadingScreen />;
  if (!currentUser) return <LoginScreen onLogin={login} onLoginWithCredentials={loginWithCredentials} />;

  const allNavItems = [
    { id: 'dashboard', label: 'IT Insights', icon: LayoutDashboard },
    { id: 'reports', label: 'Mgmt Reports', icon: FileText },
    { id: 'kpi', label: 'KPI Dashboard', icon: Activity },
    { id: 'daily-kpi', label: 'My Daily Logs', icon: Briefcase },
    { id: 'skills', label: 'Staff Matrix', icon: Users },
    { id: 'tickets', label: 'IT Support Log', icon: TicketIcon, badge: pendingTicketsCount > 0 ? pendingTicketsCount : undefined },
    { id: 'meetings', label: 'IT Meetings', icon: Calendar },
    { id: 'assets', label: 'Asset Inventory', icon: Monitor },
    { id: 'asset-users', label: 'Assets by User', icon: Users },
    { id: 'purchases', label: 'Purchases', icon: FolderClock },
    { id: 'renewals', label: 'Renewals', icon: Calendar },
    { id: 'security', label: 'Security & Monitoring', icon: ShieldCheck },
    { id: 'marketing', label: 'Digital Marketing', icon: Megaphone },
    { id: 'files', label: 'Cloud Files', icon: HardDrive },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'id-layout', label: 'ID Auto Layout', icon: Printer },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const navItems = allNavItems.filter(item => {
    if (isAdmin) return true;
    if (accessLoading) return false;
    if (['tickets', 'help', 'meetings', 'id-layout'].includes(item.id)) return true;
    if (item.id === 'asset-users') return !!userProfile?.role && canAccess(userProfile.role, 'assets');
    if (userProfile?.role) return canAccess(userProfile.role, item.id);
    return false;
  });

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000, className: 'glass-panel dark:text-slate-100 dark:bg-slate-800' }} />
      <AppShell
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab as any}
        navItems={navItems}
        accessLoading={accessLoading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isNotificationsOpen={isNotificationsOpen}
        setIsNotificationsOpen={setIsNotificationsOpen}
        pendingTicketsCount={pendingTicketsCount}
        pendingDailyKpiCount={pendingDailyKpiCount}
        isAdmin={isAdmin}
        tickets={tickets}
        currentUser={currentUser}
        userProfile={userProfile}
        onLogout={logout}
      >
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} className="w-full max-w-[1600px] mx-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {(activeTab === 'dashboard' || activeTab === 'tickets') && !canAccess(userProfile?.role as UserRole, activeTab) && !isAdmin && (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"><div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center text-rose-500 mb-4"><ShieldOff size={32} /></div><h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2 italic">Access Restricted</h3><p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">You do not have permission to access the {activeTab} module. Please contact your IT Supervisor.</p></div>
            )}
            {activeTab === 'dashboard' && canAccess(userProfile?.role as UserRole, 'dashboard') && <ReportsModule activities={activities} evidence={evidence} allDailyLogs={allDailyLogs} tickets={tickets} employees={employees} />}
            {activeTab === 'tickets' && <TicketsModule tickets={tickets} setTickets={setTickets} searchTerm={searchTerm} isAdmin={isAdmin} settings={settings} userProfile={userProfile} />}
            {activeTab === 'assets' && canAccess(userProfile?.role as UserRole, 'assets') && <AssetsModule assets={assets} setAssets={setAssets} searchTerm={searchTerm} isAdmin={isAdmin} settings={settings} />}
            {activeTab === 'asset-users' && (isAdmin || canAccess(userProfile?.role as UserRole, 'assets')) && <AssetUsersPage currentUserId={currentUser.id} isAdmin={isAdmin} settings={settings} />}
            {activeTab === 'security' && canAccess(userProfile?.role as UserRole, 'security') && <SecurityModule backups={backups} setBackups={setBackups} requests={cctvRequests} setRequests={setCctvRequests} searchTerm={searchTerm} isAdmin={isAdmin} />}
            {activeTab === 'renewals' && canAccess(userProfile?.role as UserRole, 'renewals') && <RenewalsModule renewals={renewals} setRenewals={setRenewals} isAdmin={isAdmin} />}
            {activeTab === 'purchases' && canAccess(userProfile?.role as UserRole, 'purchases') && <PurchasesModule purchases={purchases} setPurchases={setPurchases} assets={assets} setAssets={setAssets} isAdmin={isAdmin} />}
            {activeTab === 'marketing' && canAccess(userProfile?.role as UserRole, 'marketing') && <MarketingModule plans={contentPlans} setPlans={setContentPlans} isAdmin={isAdmin} />}
            {activeTab === 'settings' && <SettingsModule settings={settings} setSettings={setSettings} isAdmin={isAdmin} allNavItems={allNavItems} setAssets={setAssets} />}
            {activeTab === 'help' && <HelpSupportModule />}
            {activeTab === 'files' && canAccess(userProfile?.role as UserRole, 'files') && <FileManagerModule isAdmin={isAdmin} quota={quota} setQuota={setQuota} />}
            {activeTab === 'kpi' && canAccess(userProfile?.role as UserRole, 'kpi') && <KPIDashboard />}
            {activeTab === 'daily-kpi' && canAccess(userProfile?.role as UserRole, 'daily-kpi') && <KPITracker userRole={userProfile?.role} />}
            {activeTab === 'meetings' && <MeetingMinutesModule userRole={userProfile?.role} isAdmin={isAdmin} />}
            {activeTab === 'id-layout' && <IdLayoutGenerator />}
            {activeTab === 'skills' && isAdmin && <SkillMatrix />}
            {activeTab === 'reports' && isAdmin && <ReportsModule activities={activities} evidence={evidence} allDailyLogs={allDailyLogs} tickets={tickets} employees={employees} />}
          </motion.div>
        </AnimatePresence>
      </AppShell>
      <ConfirmationModal isOpen={confirmTarget !== null} onClose={() => setConfirmTarget(null)} onConfirm={() => { if (confirmTarget) confirmTarget.onConfirm(); }} title={confirmTarget?.title || 'Confirm Action'} message={confirmTarget?.message || ''} confirmText={confirmTarget?.confirmText || 'Confirm'} />
    </>
  );
}
