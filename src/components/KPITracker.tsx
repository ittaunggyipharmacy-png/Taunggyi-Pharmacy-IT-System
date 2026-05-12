import React, { useState, useEffect } from "react";
import { useKpiStore } from "../store/useKpiStore";
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  History as HistoryIcon,
  Layout,
  ShoppingBag,
  Share2,
  Monitor,
  Lock,
  Database,
  Users,
  HardDrive,
  Wrench,
  ClipboardList,
  X,
  Clock,
  Briefcase,
  Plus,
  Minus,
  AlertCircle,
  TrendingUp,
  Video,
  Camera,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, startOfToday, subDays, isToday, parseISO, startOfMonth, subMonths, getDay, startOfWeek } from "date-fns";
import { DailyLog, MonthlyLog, WeeklyLog, KPITask } from "../types";
import { 
  saveDailyLog, getDailyLog, 
  saveMonthlyLog, getMonthlyLog, 
  saveWeeklyLog, getWeeklyLog,
  saveActivity, saveEvidence
} from "../services/firestoreService";
import { auth } from "../services/firebase";

interface Task {
  id: string;
  category: string;
  text: string;
  type: "daily" | "weekly" | "monthly";
  dayOfWeek?: number; // 0 (Sun) to 6 (Sat)
  frequency?: string; // e.g. "2x per week"
  maxCount?: number;
}

const TASKS: Task[] = [
  // IT Supervisor (Daily)
  { id: "it_uptime", category: "IT", text: "Check System Uptime (Office, warehouse, branch, store, printer, network, POS)", type: "daily" },
  { id: "it_maint", category: "IT", text: "Hardware & Software Maintenance (PC, Printer, Scanner, CCTV, Router, software)", type: "daily" },
  { id: "it_support", category: "IT", text: "User Support Response (Solve staff IT issues timely)", type: "daily" },
  { id: "it_backup", category: "IT", text: "Data Backup & Security (Antivirus, password control, company data backup)", type: "daily" },
  { id: "it_access", category: "IT", text: "System Access Control (Email, user accounts, position-based access)", type: "daily" },
  { id: "it_asset", category: "IT", text: "IT Asset Management (Asset list, issue record, repair/replacement record)", type: "daily" },
  
  // Merchandising (Daily)
  { id: "merch_stock", category: "Merchandising", text: "Stock Visibility & Availability (Fast-moving items, out-of-stock risk control)", type: "daily" },
  { id: "merch_promo", category: "Merchandising", text: "Promotion Display Compliance (Guideline check for discount items)", type: "daily" },
  { id: "merch_visit", category: "Merchandising", text: "Branch/Store Visit Effectiveness (Follow-up on merchandising issues)", type: "daily" },

  // Marketing (Daily)
  { id: "mkt_photos", category: "Marketing", text: "Shoot 20 Product Photos and post to Viber", type: "daily", maxCount: 20 },
  { id: "mkt_inquiry", category: "Marketing", text: "Respond to online inquiries (Messenger, Viber, Comments)", type: "daily" },

  // Marketing (Weekly)
  { id: "mkt_tiktok_med", category: "Marketing", text: "Post 1 Medical Content Video on TikTok", type: "weekly", dayOfWeek: 3 }, // Wed
  { id: "mkt_tiktok_normal", category: "Marketing", text: "Post Normal Content Videos on TikTok (Total 3 videos/week including Medical)", type: "weekly", frequency: "2x per week" },
  { id: "mkt_fb_specials", category: "Marketing", text: "Post Weekend Specials on Facebook and Viber", type: "weekly", dayOfWeek: 6 }, // Sat

  // Marketing (Monthly)
  { id: "mkt_report", category: "Marketing", text: "Generate Page Performance and Reach reports", type: "monthly" }
];

const CATEGORY_COLORS: Record<string, string> = {
  IT: "bg-blue-100 text-blue-700 border-blue-200",
  Merchandising: "bg-amber-100 text-amber-700 border-amber-200",
  Marketing: "bg-purple-100 text-purple-700 border-purple-200"
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const KPITracker: React.FC = () => {
  const { completedTasks, setCompletedTasks } = useKpiStore();
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), "yyyy-MM-dd"));
  const [selectedWeek, setSelectedWeek] = useState(format(startOfWeek(startOfToday()), "yyyy-'W'II"));
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(startOfToday()), "yyyy-MM"));
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      loadLogs();
    }
  }, [selectedDate, selectedWeek, selectedMonth, currentUser, view]);

  const loadLogs = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (view === "daily") {
        const logId = `${selectedDate}_${currentUser.uid}`;
        const log = await getDailyLog(logId);
        setCompletedTasks(log?.tasks || {});
      } else if (view === "weekly") {
        const logId = `${selectedWeek}_${currentUser.uid}`;
        const log = await getWeeklyLog(logId);
        setCompletedTasks(log?.tasks || {});
      } else {
        const logId = `${selectedMonth}_${currentUser.uid}`;
        const log = await getMonthlyLog(logId);
        setCompletedTasks(log?.tasks || {});
      }
    } catch (err) {
      console.error("Failed to load log", err);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, value: any) => {
    if (!currentUser) return;
    
    const newTasks = {
      ...completedTasks,
      [taskId]: value
    };
    
    setCompletedTasks(newTasks);
    
    try {
      if (view === "daily") {
        const logId = `${selectedDate}_${currentUser.uid}`;
        await saveDailyLog({
          id: logId,
          date: selectedDate,
          userId: currentUser.uid,
          tasks: newTasks
        });
      } else if (view === "weekly") {
        const logId = `${selectedWeek}_${currentUser.uid}`;
        await saveWeeklyLog({
          id: logId,
          week: selectedWeek,
          userId: currentUser.uid,
          tasks: newTasks
        });
      } else {
        const logId = `${selectedMonth}_${currentUser.uid}`;
        await saveMonthlyLog({
          id: logId,
          month: selectedMonth,
          userId: currentUser.uid,
          tasks: newTasks
        });
      }

      // Log activity
      const task = TASKS.find(t => t.id === taskId);
      if (task) {
        await saveActivity({
          userId: currentUser.uid,
          userName: currentUser.displayName || "Unknown User",
          action: value ? `completed task: ${task.text}` : `reverted task: ${task.text}`,
          department: task.category,
          details: `Ref: ${taskId}`
        });
      }
    } catch (err) {
      console.error("Failed to save task", err);
      // Revert local state on error
      loadLogs();
    }
  };

  const currentTasks = TASKS.filter(t => t.type === view);
  const filteredTasks = activeCategory === "All" 
    ? currentTasks 
    : currentTasks.filter(t => t.category === activeCategory);

  const isTaskDueToday = (task: Task) => {
    if (view !== "weekly") return false;
    if (task.dayOfWeek !== undefined) {
      return getDay(startOfToday()) === task.dayOfWeek;
    }
    return true; // Frequency tasks are always "due" in their week
  };

  const calculateProgress = (category?: string) => {
    const tasks = category && category !== "All" 
      ? currentTasks.filter(t => t.category === category)
      : currentTasks;
    
    if (tasks.length === 0) return 0;
    
    let totalProgress = 0;
    tasks.forEach(t => {
      const val = completedTasks[t.id];
      if (t.maxCount) {
        totalProgress += (Number(val) || 0) / t.maxCount;
      } else {
        totalProgress += val ? 1 : 0;
      }
    });

    return Math.round((totalProgress / tasks.length) * 100);
  };

  const [showEvidenceModal, setShowEvidenceModal] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const handleEvidenceUpload = async () => {
    if (!currentUser || !showEvidenceModal || !evidenceUrl) return;
    
    const logId = view === "daily" ? `${selectedDate}_${currentUser.uid}` : 
                 view === "weekly" ? `${selectedWeek}_${currentUser.uid}` : 
                 `${selectedMonth}_${currentUser.uid}`;

    try {
      await saveEvidence({
        taskId: showEvidenceModal,
        logId,
        imageUrl: evidenceUrl,
        timestamp: new Date().toISOString(),
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous"
      });
      
      // Also mark task as completed (or increment)
      const taskDef = TASKS.find(t => t.id === showEvidenceModal);
      if (taskDef?.maxCount) {
         const currentVal = Number(completedTasks[showEvidenceModal]) || 0;
         updateTask(showEvidenceModal, Math.min(taskDef.maxCount, currentVal + 1));
      } else {
         updateTask(showEvidenceModal, new Date().toISOString());
      }
      
      setShowEvidenceModal(null);
      setEvidenceUrl("");
      alert("Evidence uploaded successfully!");
    } catch (err) {
      console.error("Failed to upload evidence", err);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Lock size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">Please sign in to access the KPI Tracker</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Main Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-indigo-600" />
            Operational KPI Tracker
          </h2>
          <p className="text-sm text-slate-500">Taunggyi Pharmacy Excellence Monitoring</p>
        </div>

        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 self-start">
          {(["daily", "weekly", "monthly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
                view === v 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Date/Week/Month Selection & Category Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
          <button 
            onClick={() => {
              if (view === "daily") setSelectedDate(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
              else if (view === "weekly") setSelectedWeek(format(subDays(parseISO(selectedDate), 7), "yyyy-'W'II"));
              else setSelectedMonth(format(subMonths(parseISO(selectedMonth + "-01"), 1), "yyyy-MM"));
            }}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 flex items-center gap-2 min-w-[140px] justify-center">
            <Calendar size={16} className="text-indigo-500" />
            <span className="text-sm font-bold text-slate-700">
              {view === "daily" && (isToday(parseISO(selectedDate)) ? "Today" : format(parseISO(selectedDate), "MMM dd, yyyy"))}
              {view === "weekly" && `Week of ${format(startOfWeek(parseISO(selectedDate)), "MMM dd")}`}
              {view === "monthly" && format(parseISO(selectedMonth + "-01"), "MMMM yyyy")}
            </span>
          </div>
          <button 
            onClick={() => {
              if (view === "daily") setSelectedDate(format(subDays(parseISO(selectedDate), -1), "yyyy-MM-dd"));
              else if (view === "weekly") setSelectedWeek(format(subDays(parseISO(selectedDate), -7), "yyyy-'W'II"));
              else setSelectedMonth(format(subMonths(parseISO(selectedMonth + "-01"), -1), "yyyy-MM"));
            }}
            disabled={view === "daily" ? isToday(parseISO(selectedDate)) : false}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {["All", "IT", "Merchandising", "Marketing"].map(cat => {
            const isSelected = activeCategory === cat;
            const progress = calculateProgress(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                  isSelected 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                }`}
              >
                {cat}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}>
                  {progress}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Progress Summary Cards */}
        <div className="lg:col-span-1 space-y-4">
          {["IT", "Merchandising", "Marketing"].map(cat => {
            const progress = calculateProgress(cat);
            return (
              <div key={cat} className="enterprise-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    cat === 'IT' ? 'text-blue-500' : cat === 'Merchandising' ? 'text-amber-500' : 'text-purple-500'
                  }`}>
                    {cat}
                  </span>
                  <span className="text-sm font-bold text-slate-700">{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full rounded-full ${
                      cat === 'IT' ? 'bg-blue-500' : cat === 'Merchandising' ? 'bg-amber-500' : 'bg-purple-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}
          
          <div className="enterprise-card p-4 bg-indigo-600 text-white">
            <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest">Overall Progress</h3>
            <div className="mt-2 text-4xl font-black">{calculateProgress()}%</div>
            <p className="mt-2 text-[10px] font-medium opacity-70">Based on {currentTasks.length} {view} objectives</p>
          </div>
        </div>

        {/* Task List */}
        <div className="lg:col-span-3">
          <div className="enterprise-card overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">
                <TrendingUp size={16} className="text-indigo-600" />
                {view} Checklist
              </h3>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-3">
                  <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Syncing Data...</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredTasks.map((task) => {
                    const value = completedTasks[task.id];
                    const isCompleted = task.maxCount ? value === task.maxCount : !!value;
                    const isDueToday = isTaskDueToday(task);

                    return (
                      <motion.div 
                        key={task.id}
                        className={`p-5 flex items-start gap-4 transition-all ${
                          isCompleted ? "opacity-40" : ""
                        } ${isDueToday && !isCompleted ? "bg-indigo-50/30 ring-1 ring-inset ring-indigo-100" : ""}`}
                      >
                          <div className="mt-0.5 shrink-0 flex flex-col items-center gap-2">
                            {task.maxCount ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border-2 ${
                                  isCompleted ? "border-emerald-500 text-emerald-500" : "border-slate-200 text-slate-500"
                                }`}>
                                  <Camera size={16} />
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => updateTask(task.id, !value ? new Date().toISOString() : false)}
                                className={`transition-colors ${isCompleted ? "text-emerald-500" : "text-slate-300 hover:text-indigo-400"}`}
                              >
                                {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                              </button>
                            )}

                            {/* Evidence Upload Trigger */}
                            {(task.id === "mkt_photos" || task.id === "merch_visit" || task.id === "it_asset") && (
                              <button 
                                onClick={() => setShowEvidenceModal(task.id)}
                                className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                                title="Upload Evidence"
                              >
                                <Camera size={14} />
                              </button>
                            )}
                          </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex justify-between">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[task.category]}`}>
                                {task.category}
                              </span>
                              {task.dayOfWeek !== undefined && (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  isDueToday ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}>
                                  <Clock size={10} />
                                  {DAY_NAMES[task.dayOfWeek]}
                                </span>
                              )}
                              {task.frequency && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                                  {task.frequency}
                                </span>
                              )}
                              {typeof value === 'string' && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                  {format(new Date(value), "HH:mm")}
                                </span>
                              )}
                            </div>
                            
                            {task.maxCount && (
                              <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                {Number(value) || 0} / {task.maxCount}
                              </div>
                            )}
                            {isDueToday && !isCompleted && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white animate-pulse">
                                DUE TODAY
                              </span>
                            )}
                          </div>

                          <p className={`text-base font-semibold transition-all ${
                            isCompleted ? "text-slate-400 line-through" : "text-slate-700"
                          }`}>
                            {task.text}
                          </p>

                          {task.maxCount && (
                            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100 w-fit">
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => updateTask(task.id, Math.max(0, (Number(value) || 0) - 1))}
                                  className="p-1 hover:bg-white rounded-lg text-slate-400 disabled:opacity-30"
                                  disabled={!value}
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="w-12 text-center font-black text-slate-800">{value || 0} / {task.maxCount}</span>
                                <button 
                                  onClick={() => updateTask(task.id, Math.min(task.maxCount!, (Number(value) || 0) + 1))}
                                  className="p-1 hover:bg-white rounded-lg text-slate-400 disabled:opacity-30"
                                  disabled={value === task.maxCount}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${((Number(value) || 0) / task.maxCount) * 100}%` }}
                                  className="h-full bg-emerald-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showEvidenceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEvidenceModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Photo Evidence</h3>
              <p className="text-sm text-slate-500 mb-6">
                Please provide a URL for the photo proof for: <span className="font-bold text-indigo-600">{TASKS.find(t => t.id === showEvidenceModal)?.text}</span>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Image URL</label>
                  <input 
                    type="url"
                    value={evidenceUrl}
                    onChange={e => setEvidenceUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowEvidenceModal(null)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleEvidenceUpload}
                    disabled={!evidenceUrl}
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    Confirm Upload
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
