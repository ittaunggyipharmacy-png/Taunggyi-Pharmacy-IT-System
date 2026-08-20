import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  LayoutDashboard, 
  Ticket, 
  Laptop, 
  ShoppingCart, 
  CalendarClock, 
  Users, 
  Share2, 
  HardDrive, 
  ShieldCheck, 
  FileSpreadsheet, 
  FileText, 
  Settings as SettingsIcon, 
  HelpCircle, 
  Search, 
  Bell, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Lock,
  ChevronRight
} from 'lucide-react';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { syncSystemUser } from './services/firestoreService';
import { 
  ITAsset, 
  ITTicket, 
  PurchaseRecord, 
  RenewalRecord, 
  MeetingMinute, 
  EmployeeProfile, 
  ContentPlan, 
  BackupLog, 
  SystemSettings, 
  SystemUser, 
  UserRole 
} from './types';

// Route-level lazy loading
const Dashboard = lazy(() => import('./components/Dashboard'));
const TicketsModule = lazy(() => import('./components/TicketsModule'));
const AssetsModule = lazy(() => import('./components/AssetsModule'));
const PurchasesModule = lazy(() => import('./components/PurchasesModule'));
const RenewalsModule = lazy(() => import('./components/RenewalsModule'));
const MeetingMinutesModule = lazy(() => import('./components/MeetingMinutesModule'));
const SkillMatrix = lazy(() => import('./components/SkillMatrix'));
const MarketingModule = lazy(() => import('./components/MarketingModule'));
const FileManagerModule = lazy(() => import('./components/FileManagerModule'));
const SecurityModule = lazy(() => import('./components/SecurityModule'));
const ReportsModule = lazy(() => import('./components/ReportsModule'));
const SettingsModule = lazy(() => import('./components/SettingsModule'));
const HelpSupportModule = lazy(() => import('./components/HelpSupportModule'));

const DEFAULT_SETTINGS: SystemSettings = {
  departments: ['IT', 'Merchandising', 'Digital Marketing', 'Accounts', 'Management', 'Warehouse'],
  locations: ['Central Storage', 'Branch 1', 'Branch 2', 'Branch 3', 'HQ Server Room'],
  itContacts: [
    { name: 'IT Support Team', role: 'Helpdesk', phone: '09-940-931-313' }
  ],
  branchNotes: []
};

export function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<SystemUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Collections state with scoped snapshots
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [contentPlans, setContentPlans] = useState<ContentPlan[]>([]);
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Authentication listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profile = await syncSystemUser(firebaseUser);
          setUserProfile(profile);
        } catch (e) {
          console.error("User profile sync error:", e);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Theme initialization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Firestore Subscriptions (Scoped when authenticated)
  useEffect(() => {
    if (!user) return;

    const unsubs = [
      onSnapshot(collection(db, 'it_assets'), (snap) => {
        setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ITAsset));
      }),
      onSnapshot(collection(db, 'it_tickets'), (snap) => {
        setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ITTicket));
      }),
      onSnapshot(collection(db, 'purchase_records'), (snap) => {
        setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() }) as PurchaseRecord));
      }),
      onSnapshot(collection(db, 'renewals'), (snap) => {
        setRenewals(snap.docs.map(d => ({ id: d.id, ...d.data() }) as RenewalRecord));
      }),
      onSnapshot(collection(db, 'meeting_minutes'), (snap) => {
        setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() }) as MeetingMinute));
      }),
      onSnapshot(collection(db, 'employees'), (snap) => {
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }) as EmployeeProfile));
      }),
      onSnapshot(collection(db, 'content_plans'), (snap) => {
        setContentPlans(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContentPlan));
      }),
      onSnapshot(collection(db, 'backup_logs'), (snap) => {
        setBackups(snap.docs.map(d => ({ id: d.id, ...d.data() }) as BackupLog));
      }),
      onSnapshot(collection(db, 'system_config'), (snap) => {
        const main = snap.docs.find(d => d.id === 'main');
        if (main) setSettings(main.data() as SystemSettings);
      })
    ];

    return () => unsubs.forEach(u => u());
  }, [user]);

  const isAdmin = userProfile?.isAdmin || 
    userProfile?.role === UserRole.SUPER_ADMIN || 
    userProfile?.role === UserRole.IT_SUPERVISOR || 
    user?.email === "it.taunggyipharmacy@gmail.com";

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      alert(`Sign in error: ${e.message}`);
    }
  };

  const handleSignOut = () => signOut(auth);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets', label: 'IT Tickets', icon: Ticket, badge: tickets.filter(t => t.status === 'Pending').length },
    { id: 'assets', label: 'Hardware Assets', icon: Laptop },
    { id: 'purchases', label: 'Procurement', icon: ShoppingCart },
    { id: 'renewals', label: 'Renewals & Expiry', icon: CalendarClock },
    { id: 'meetings', label: 'Meeting Minutes', icon: FileText },
    { id: 'skills', label: 'Skill Matrix', icon: Users },
    { id: 'marketing', label: 'Marketing Content', icon: Share2 },
    { id: 'files', label: 'Google Drive Files', icon: HardDrive },
    { id: 'security', label: 'Security & CCTV', icon: ShieldCheck },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { id: 'settings', label: 'System Settings', icon: SettingsIcon },
    { id: 'help', label: 'Help & Docs', icon: HelpCircle },
  ];

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Initializing Taunggyi Pharmacy IT Hub...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Taunggyi Pharmacy IT Management Hub</h1>
            <p className="text-xs text-slate-400 mt-2">Enterprise operations, hardware registry, and access control</p>
          </div>
          <button
            onClick={handleSignIn}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-2xl shadow-lg transition-all"
          >
            Sign in with Authorized Google Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 dark:text-slate-300">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-bold text-sm text-slate-900 dark:text-white">TP IT Hub</span>
        </div>
        <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-rose-600">
          <LogOut size={18} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen flex flex-col ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-0 lg:translate-x-0 hidden lg:flex'
      }`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Taunggyi Pharmacy</h2>
          <p className="text-2xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">IT Operations Hub</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
              </p>
              <span className="text-2xs text-slate-400 font-medium block truncate">
                {userProfile?.role || 'Staff Viewer'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search across assets, tickets, purchases..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {/* View Router */}
        <div className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            {activeTab === 'dashboard' && (
              <Dashboard
                tickets={tickets}
                assets={assets}
                backups={backups}
                quota={null}
              />
            )}
            {activeTab === 'tickets' && (
              <TicketsModule
                tickets={tickets}
                searchTerm={globalSearch}
                isAdmin={isAdmin}
                settings={settings}
                userProfile={userProfile}
              />
            )}
            {activeTab === 'assets' && (
              <AssetsModule
                assets={assets}
                searchTerm={globalSearch}
                isAdmin={isAdmin}
                settings={settings}
              />
            )}
            {activeTab === 'purchases' && (
              <PurchasesModule
                purchases={purchases}
                searchTerm={globalSearch}
                isAdmin={isAdmin}
              />
            )}
            {activeTab === 'renewals' && (
              <RenewalsModule
                renewals={renewals}
                isAdmin={isAdmin}
              />
            )}
            {activeTab === 'meetings' && (
              <MeetingMinutesModule
                meetings={meetings}
                isAdmin={isAdmin}
              />
            )}
            {activeTab === 'skills' && (
              <SkillMatrix
                employees={employees}
                settings={settings}
              />
            )}
            {activeTab === 'marketing' && (
              <MarketingModule
                contentPlans={contentPlans}
                isAdmin={isAdmin}
              />
            )}
            {activeTab === 'files' && (
              <FileManagerModule
                isAdmin={isAdmin}
              />
            )}
            {activeTab === 'security' && (
              <SecurityModule
                backups={backups}
                isAdmin={isAdmin}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsModule
                assets={assets}
                tickets={tickets}
                purchases={purchases}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsModule
                settings={settings}
                setSettings={setSettings}
                isAdmin={isAdmin}
                allNavItems={navigationItems}
              />
            )}
            {activeTab === 'help' && (
              <HelpSupportModule />
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default App;
