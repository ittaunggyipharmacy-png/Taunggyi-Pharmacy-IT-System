import React, { useState, useEffect, useMemo } from "react";
import { 
 Calendar, 
 Clock, 
 MapPin, 
 User, 
 Users, 
 Plus, 
 Trash2, 
 Search, 
 CheckCircle2, 
 XCircle, 
 AlertCircle, 
 Filter, 
 ArrowRight, 
 Edit3, 
 ClipboardList, 
 Check, 
 MessageSquare, 
 AlertTriangle,
 Loader2,
 Bookmark,
 FileText,
 Clock3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { saveMeetingMinute, deleteMeetingMinute } from "../../services/meetingService";
import { saveActivity } from "../../services/kpiService";
import { MeetingMinute, MeetingActionItem, UserRole, SystemUser } from "../../types";
import { cn } from "../../lib/utils";
import { format, isBefore, isToday, parseISO, differenceInDays } from "date-fns";

interface MeetingMinutesModuleProps {
 userRole?: UserRole;
 isAdmin?: boolean;
}

export default function MeetingMinutesModule({ userRole, isAdmin }: MeetingMinutesModuleProps) {
 // Real-time state
 const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
 const [users, setUsers] = useState<SystemUser[]>([]);
 const [loading, setLoading] = useState(true);

 // Nav tab state
 const [activeSubTab, setActiveSubTab] = useState<"minutes" | "followup">("minutes");

 // Filters & Search
 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("All");
 const [deptFilter, setDeptFilter] = useState<string>("All");
 const [assigneeFilter, setAssigneeFilter] = useState<string>("All");

 // Modals & Forms
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [selectedMeeting, setSelectedMeeting] = useState<MeetingMinute | null>(null);
 const [isEditingMeeting, setIsEditingMeeting] = useState(false);

 // Form State
 const [formTitle, setFormTitle] = useState("");
 const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
 const [formTime, setFormTime] = useState("");
 const [formLocation, setFormLocation] = useState("");
 const [formContent, setFormContent] = useState("");
 const [attendeeInput, setAttendeeInput] = useState("");
 const [formAttendees, setFormAttendees] = useState<string[]>([]);
 const [formActionItems, setFormActionItems] = useState<MeetingActionItem[]>([]);

 // Action item remark editing state
 const [editingRemarkItemId, setEditingRemarkItemId] = useState<string | null>(null);
 const [tempRemark, setTempRemark] = useState("");

 const DEPARTMENTS = ["IT", "Merchandising", "Digital Marketing", "Management", "Sales", "Retail"];

 const [currentUser, setCurrentUser] = useState<any>(null);

 useEffect(() => {
   supabase.auth.getUser().then(({ data }) => {
     if (data.user) {
       setCurrentUser({
         email: data.user.email,
         displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0]
       });
     }
   });

   const fetchData = async () => {
     setLoading(true);
     const [meetingsRes, usersRes] = await Promise.all([
       supabase.from('meeting_minutes').select('*').order('date', { ascending: false }),
       supabase.from('app_users').select('*')
     ]);
     if (!meetingsRes.error && meetingsRes.data) {
       setMeetings(meetingsRes.data);
     }
     if (!usersRes.error && usersRes.data) {
       setUsers(usersRes.data);
     }
     setLoading(false);
   };
   fetchData();
 }, []);

 // Compute status metrics of Action Items
 const metrics = useMemo(() => {
 let totalMeetings = meetings.length;
 let pending = 0;
 let inProgress = 0;
 let completed = 0;

 meetings.forEach(m => {
 m.actionItems?.forEach(item => {
 if (item.status === "Pending") pending++;
 else if (item.status === "In Progress") inProgress++;
 else if (item.status === "Completed") completed++;
 });
 });

 return { totalMeetings, pending, inProgress, completed };
 }, [meetings]);

 // Handle building form logic
 const handleOpenCreateModal = (meet: MeetingMinute | null = null) => {
 if (meet) {
 // Editing
 setIsEditingMeeting(true);
 setFormTitle(meet.title);
 setFormDate(meet.date);
 setFormTime(meet.time || "");
 setFormLocation(meet.location || "");
 setFormContent(meet.content);
 setFormAttendees(meet.attendees || []);
 setFormActionItems(meet.actionItems || []);
 } else {
 // New
 setIsEditingMeeting(false);
 setFormTitle("");
 setFormDate(format(new Date(), "yyyy-MM-dd"));
 setFormTime("");
 setFormLocation("");
 setFormContent("");
 setFormAttendees([]);
 setFormActionItems([]);
 }
 setAttendeeInput("");
 setIsCreateModalOpen(true);
 };

 const handleAddAttendee = () => {
 if (attendeeInput.trim() && !formAttendees.includes(attendeeInput.trim())) {
 setFormAttendees([...formAttendees, attendeeInput.trim()]);
 setAttendeeInput("");
 }
 };

 const handleRemoveAttendee = (index: number) => {
 setFormAttendees(formAttendees.filter((_, idx) => idx !== index));
 };

 const handleAddActionItem = () => {
 const newItem: MeetingActionItem = {
 id: "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
 task: "",
 assignedTo: "",
 department: "IT",
 dueDate: format(new Date(), "yyyy-MM-dd"),
 status: "Pending",
 remarks: ""
 };
 setFormActionItems([...formActionItems, newItem]);
 };

 const handleUpdateActionItemField = (id: string, field: keyof MeetingActionItem, val: any) => {
 setFormActionItems(prev => prev.map(item => {
 if (item.id === id) {
 return { ...item, [field]: val };
 }
 return item;
 }));
 };

 const handleRemoveActionItem = (id: string) => {
 setFormActionItems(prev => prev.filter(item => item.id !== id));
 };

 const handleSaveMeeting = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formTitle.trim()) return;

 // Check if any action items are empty
 const invalidItems = formActionItems.some(item => !item.task.trim());
 if (invalidItems) {
 alert("ကျေးဇူးပြု၍ Action Item များအားလုံး၏ အချက်အလက်များ ဖြည့်သွင်းပေးပါ။");
 return;
 }

 const meetingData: Partial<MeetingMinute> = {
 title: formTitle,
 date: formDate,
 time: formTime,
 location: formLocation,
 content: formContent,
 attendees: formAttendees,
 actionItems: formActionItems,
 createdAt: new Date().toISOString(),
 createdBy: currentUser?.displayName || currentUser?.email || "System",
 createdByEmail: currentUser?.email || ""
 };

 if (isEditingMeeting && selectedMeeting) {
 meetingData.id = selectedMeeting.id;
 }

 try {
 await saveMeetingMinute(meetingData);
 setIsCreateModalOpen(false);
 setSelectedMeeting(null);
 // Log activities
 saveActivity({
 action: isEditingMeeting ? `Updated Meeting Minutes: ${formTitle}` : `Recorded Meeting Minutes: ${formTitle}`,
 details: `Saved by ${currentUser?.email} with ${formActionItems.length} action item(s).`
 });
 } catch (err) {
 console.error("Error saving meeting", err);
 }
 };

 const handleDeleteMeeting = async (meetingId: string, title: string) => {
 if (confirm(`အစည်းအဝေးမှတ်တမ်း - "${title}" ကို ဖျက်ရန် သေချာပါသလား?`)) {
 try {
 await deleteMeetingMinute(meetingId);
 setSelectedMeeting(null);
 saveActivity({
 action: `Deleted Meeting Minutes: ${title}`,
 details: `Minutes deleted by ${currentUser?.email}`
 });
 } catch (err) {
 console.error("Error deleting meeting", err);
 }
 }
 };

 // Direct Update Action Item Status & Remark from active views
 const handleUpdateSingleActionItemStatus = async (
 meeting: MeetingMinute, 
 itemId: string, 
 newStatus: "Pending" | "In Progress" | "Completed" | "Cancelled"
 ) => {
 const updatedActionItems = meeting.actionItems.map(item => {
 if (item.id === itemId) {
 return { 
 ...item, 
 status: newStatus,
 completedAt: newStatus === "Completed" ? new Date().toISOString() : undefined
 };
 }
 return item;
 });

 const targetItem = meeting.actionItems.find(i => i.id === itemId);

 try {
 await saveMeetingMinute({
 ...meeting,
 actionItems: updatedActionItems
 });

 // Update selected meeting if viewing detail
 if (selectedMeeting && selectedMeeting.id === meeting.id) {
 setSelectedMeeting({
 ...selectedMeeting,
 actionItems: updatedActionItems
 });
 }

 // Log action
 saveActivity({
 action: `Action Item Status updated: ${newStatus}`,
 details: `Task: "${targetItem?.task}". Assignee: ${targetItem?.assignedTo}. Meeting: "${meeting.title}"`
 });
 } catch (err) {
 console.error("Error updating status", err);
 }
 };

 const handleSaveSingleActionItemRemark = async (meeting: MeetingMinute, itemId: string) => {
 const updatedActionItems = meeting.actionItems.map(item => {
 if (item.id === itemId) {
 return { 
 ...item, 
 remarks: tempRemark.trim()
 };
 }
 return item;
 });

 try {
 await saveMeetingMinute({
 ...meeting,
 actionItems: updatedActionItems
 });

 if (selectedMeeting && selectedMeeting.id === meeting.id) {
 setSelectedMeeting({
 ...selectedMeeting,
 actionItems: updatedActionItems
 });
 }

 setEditingRemarkItemId(null);
 setTempRemark("");

 saveActivity({
 action: `Action Item Remark updated`,
 details: `Meeting ID: ${meeting.id}. Item ID: ${itemId}`
 });
 } catch (err) {
 console.error("Error saving remark", err);
 }
 };

 // Filter and Search Meetings
 const filteredMeetings = useMemo(() => {
 return meetings.filter(m => {
 const matchQuery = !searchQuery.trim() || 
 m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (m.attendees || []).some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
 (m.actionItems || []).some(item => item.task.toLowerCase().includes(searchQuery.toLowerCase()));

 return matchQuery;
 });
 }, [meetings, searchQuery]);

 // Extract all compiled follow-up tasks across all meetings
 const allFollowUpItems = useMemo(() => {
 const list: Array<{ meeting: MeetingMinute; item: MeetingActionItem }> = [];
 meetings.forEach(m => {
 if (m.actionItems) {
 m.actionItems.forEach(item => {
 list.push({ meeting: m, item });
 });
 }
 });

 // Apply filters
 return list.filter(({ meeting, item }) => {
 const matchSearch = !searchQuery.trim() || 
 item.task.toLowerCase().includes(searchQuery.toLowerCase()) || 
 meeting.title.toLowerCase().includes(searchQuery.toLowerCase());

 const matchStatus = statusFilter === "All" || item.status === statusFilter;
 const matchDept = deptFilter === "All" || item.department === deptFilter;
 
 const matchAssignee = assigneeFilter === "All" || 
 item.assignedTo.toLowerCase() === assigneeFilter.toLowerCase() ||
 (assigneeFilter === "Unassigned" && !item.assignedTo);

 return matchSearch && matchStatus && matchDept && matchAssignee;
 });
 }, [meetings, searchQuery, statusFilter, deptFilter, assigneeFilter]);

 // Helper relative days formatting
 const getDueBadgeClass = (dueDateStr: string, status: string) => {
 if (status === "Completed") return "bg-slate-100 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800";
 if (status === "Cancelled") return "bg-slate-50 text-slate-400 border-slate-100 line-through";
 
 try {
 const due = parseISO(dueDateStr);
 const today = new Date();
 
 if (isToday(due)) {
 return "bg-amber-100 text-amber-800 border-amber-200 animate-pulse font-medium";
 }
 
 if (isBefore(due, today)) {
 return "bg-rose-100 text-rose-800 border-rose-200 font-medium";
 }
 
 const daysLeft = differenceInDays(due, today);
 if (daysLeft <= 3) {
 return "bg-amber-50 text-amber-700 border-amber-200";
 }
 
 return "bg-emerald-50 text-emerald-700 border-emerald-100";
 } catch {
 return "bg-slate-100 text-slate-600 dark:text-slate-300";
 }
 };

 const getDueText = (dueDateStr: string, status: string) => {
 if (status === "Completed") return "Completed";
 if (status === "Cancelled") return "Cancelled";

 try {
 const due = parseISO(dueDateStr);
 const today = new Date();
 
 if (isToday(due)) return "Due Today (ဒီနေ့)";
 if (isBefore(due, today)) {
 const days = differenceInDays(today, due);
 return `Overdue by ${days} day${days > 1 ? "s" : ""} (${days} ရက် ကျော်လွန်နေ)`;
 }
 
 const daysLeft = differenceInDays(due, today);
 if (daysLeft === 0) return "Due Tomorrow";
 return `Due in ${daysLeft} day${daysLeft > 1 ? "s" : ""} (${daysLeft} ရက် လိုသေး)`;
 } catch {
 return dueDateStr;
 }
 };

 const getStatusBadgeClass = (status: string) => {
 switch (status) {
 case "Pending": return "bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800";
 case "In Progress": return "bg-indigo-50 text-indigo-700 border-indigo-200";
 case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
 case "Cancelled": return "bg-rose-50 text-rose-600 border-rose-200 line-through";
 default: return "bg-slate-50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800";
 }
 };

 return (
 <div className="enterprise-container p-4 lg:p-8 flex flex-col gap-6 max-h-[92vh] overflow-y-auto">
 
 {/* 1. Header & Quick Analytics */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
 <div>
 <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
 <ClipboardList className="text-indigo-600" />
 Meeting Minutes & Action Items
 </h1>
 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
 အစည်းအဝေးမှတ်တမ်းများနှင့် တာဝန်ပေးချက်များအား စနစ်တကျ Follow-up လိုက်ရန်
 </p>
 </div>

 <button
 onClick={() => handleOpenCreateModal(null)}
 className="px-5 py-3 bg-indigo-600 text-white font-medium rounded-xl text-xs font-medium hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg hover:translate-y-[-1px] self-start lg:self-auto"
 >
 <Plus size={16} />
 Record Meeting (မှတ်တမ်းအသစ်သွင်းရန်)
 </button>
 </div>

 {mt_analytics_cards(metrics)}

 {/* 3. Sub Tab Bar & Search Area */}
 <div className="bg-white dark:bg-slate-900 border border-slate-100 rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm shrink-0">
 <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl self-start">
 <button
 onClick={() => { setActiveSubTab("minutes"); setSearchQuery(""); }}
 className={cn(
 "px-4 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 transition-all",
 activeSubTab === "minutes" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
 )}
 >
 Meetings (အစည်းအဝေးမှတ်တမ်းများ)
 </button>
 <button
 onClick={() => { setActiveSubTab("followup"); setSearchQuery(""); }}
 className={cn(
 "px-4 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 transition-all flex items-center gap-1.5",
 activeSubTab === "followup" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow animate-pulse" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
 )}
 >
 Follow-up Board (လုပ်ငန်းများ ကြီးကြပ်ရန်)
 </button>
 </div>

 {/* Global Search */}
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
 <input
 type="text"
 placeholder={
 activeSubTab === "minutes" 
 ? "အစည်းအဝေး ခေါင်းစဉ်၊ အကြောင်းအရာဖြင့် ရှာရန်..." 
 : "တာဝန်ပေးထားသူ၊ ခေါင်းစဉ်၊ အကြောင်းအရာဖြင့် ရှာရန်..."
 }
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
 />
 </div>
 </div>

 {/* Dynamic Content Space based on Sub Tabs */}
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
 <Loader2 className="animate-spin text-indigo-500" size={32} />
 <p className="text-xs font-medium">Fetching minutes from database...</p>
 </div>
 ) : activeSubTab === "minutes" ? (
 
 /*Tab 1: Meeting minutes grid*/
 filteredMeetings.length === 0 ? (
 <div className="enterprise-card p-16 text-center text-slate-300 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-3 rounded-2xl">
 <Bookmark size={40} strokeWidth={1.5} className="text-slate-400" />
 <p className="font-medium text-slate-400">အစည်းအဝေးမှတ်တမ်း မရှိပါ။</p>
 <button
 onClick={() => handleOpenCreateModal(null)}
 className="mt-2 text-xs text-indigo-500 border border-indigo-200 hover:bg-slate-50 rounded-xl px-4 py-2 transition-colors font-medium"
 >
 မှတ်တမ်းအသစ် တစ်ခုထည့်မည်
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {filteredMeetings.map((m) => {
 const itemsSize = m.actionItems?.length || 0;
 const completedSize = m.actionItems?.filter(i => i.status === "Completed").length || 0;
 const pct = itemsSize > 0 ? Math.round((completedSize / itemsSize) * 100) : 100;

 return (
 <motion.div
 key={m.id}
 layoutId={`meeting-${m.id}`}
 onClick={() => setSelectedMeeting(m)}
 className="bg-white dark:bg-slate-900 border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer hover:border-indigo-100 transition-all flex flex-col justify-between"
 >
 <div>
 <div className="flex items-center justify-between gap-2 mb-3">
 <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400">
 <Calendar size={12} />
 {m.date ? format(parseISO(m.date), "dd MMM yyyy") : "No Date"}
 </div>
 {m.time && (
 <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium tracking-wide">
 <Clock size={12} />
 {m.time}
 </div>
 )}
 </div>

 <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 tracking-tight  hover:text-indigo-600 transition-colors">
 {m.title}
 </h3>

 {m.location && (
 <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium mb-3">
 <MapPin size={12} className="text-slate-400" />
 {m.location}
 </p>
 )}

 <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed italic border-l-2 border-slate-100 pl-3">
 {m.content}
 </p>
 </div>

 {/* Actions Completeness tracking visualizer */}
 <div className="pt-4 border-t border-slate-50 mt-4">
 <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium ">
 <span className="text-xs tracking-widest font-medium text-slate-400">Action items status</span>
 <span className="text-xs tracking-wide text-indigo-600">
 {completedSize}/{itemsSize} ({pct}%)
 </span>
 </div>

 <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
 <div 
 className={cn(
 "h-full rounded-full transition-all duration-500",
 pct === 100 ? "bg-emerald-500" : "bg-indigo-600"
 )}
 style={{ width: `${pct}%` }}
 ></div>
 </div>

 {/* Attendees chips */}
 {m.attendees?.length > 0 && (
 <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap text-ellipsis mt-3">
 <Users size={12} className="text-slate-400 min-w-[12px]" />
 <div className="text-xs text-slate-400 font-medium overflow-hidden text-ellipsis">
 {m.attendees.slice(0, 3).join(", ")}
 {m.attendees.length > 3 && ` +${m.attendees.length - 3}`}
 </div>
 </div>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 )
 ) : (
 /*Tab 2: Action Items Follow-up List*/
 <div className="flex flex-col gap-6">
 {/* Filters section */}
 <div className="bg-white dark:bg-slate-900 border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
 <h3 className="text-xs font-medium text-slate-400 flex items-center gap-2">
 <Filter size={14} className="text-slate-500 dark:text-slate-400" />
 Follow-up Advanced Sorting Filters
 </h3>
 
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {/* Filter by Status */}
 <div>
 <label className="text-xs text-slate-400 font-medium mb-1.5 block">Status</label>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium text-slate-700 dark:text-slate-200"
 >
 <option value="All">All Status (အားလုံး)</option>
 <option value="Pending">Pending (စောင့်ဆိုင်းဆဲ)</option>
 <option value="In Progress">In Progress (ဆောင်ရွက်ဆဲ)</option>
 <option value="Completed">Completed (ပြီးစီး)</option>
 <option value="Cancelled">Cancelled (ပယ်ဖျက်)</option>
 </select>
 </div>

 {/* Filter by Department */}
 <div>
 <label className="text-xs text-slate-400 font-medium mb-1.5 block">Department / Task Scope</label>
 <select
 value={deptFilter}
 onChange={(e) => setDeptFilter(e.target.value)}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium text-slate-700 dark:text-slate-200"
 >
 <option value="All">All Departments (ဌာနအားလုံး)</option>
 {DEPARTMENTS.map(d => (
 <option key={d} value={d}>{d}</option>
 ))}
 </select>
 </div>

 {/* Filter by Assignee */}
 <div>
 <label className="text-xs text-slate-400 font-medium mb-1.5 block">Assignee (လုပ်ငန်းတာဝန်ကျသူ)</label>
 <select
 value={assigneeFilter}
 onChange={(e) => setAssigneeFilter(e.target.value)}
 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium text-slate-700 dark:text-slate-200"
 >
 <option value="All">All Assignees (အားလုံး)</option>
 <option value="Unassigned">Unassigned (တာဝန်မပေးရသေး)</option>
 {[...new Set(users.map(u => u.displayName || u.email || ""))].filter(Boolean).map(name => (
 <option key={name} value={name}>{name}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* Action Items List Table */}
 {allFollowUpItems.length === 0 ? (
 <div className="bg-white dark:bg-slate-900 border border-slate-100 p-16 text-center text-slate-300 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3">
 <ClipboardList size={40} className="text-slate-400" />
 <p className="font-medium text-slate-400">ရှာဖွေမှုနှင့် ကိုက်ညီသော Follow-up တာဝန်များ မရှိပါ။</p>
 </div>
 ) : (
 <div className="bg-white dark:bg-slate-900 border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
 <thead>
 <tr className="bg-slate-50 text-xs text-slate-400 font-medium border-b border-slate-100">
 <th className="px-4 py-3.5">Action Item (လုပ်ငန်းတာဝန်)</th>
 <th className="px-4 py-3.5">Assigned To (တာဝန်ကျသူ)</th>
 <th className="px-4 py-3.5">Scope / Goal</th>
 <th className="px-4 py-3.5">Due Target (သတ်မှတ်ရက်)</th>
 <th className="px-4 py-3.5 text-center">Current Status (အခြေအနေ)</th>
 <th className="px-4 py-3.5">Remarks / Follow-up Updates (တိုးတက်မှုမှတ်တမ်း)</th>
 </tr>
 </thead>
 <tbody>
 {allFollowUpItems.map(({ meeting, item }) => (
 <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
 
 {/* Task Col */}
 <td className="px-4 py-3.5 max-w-sm">
 <div className="flex flex-col gap-1">
 <span className="font-medium text-slate-800 dark:text-slate-100 break-words whitespace-pre-wrap text-xs lg:text-sm">
 {item.task}
 </span>
 <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
 <FileText size={10} />
 Meeting: <strong className="hover:underline cursor-pointer text-slate-500 dark:text-slate-400" onClick={() => setSelectedMeeting(meeting)}>{meeting.title}</strong>
 </span>
 </div>
 </td>

 {/* Assignee Col */}
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
 <User size={12} />
 </div>
 <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
 {item.assignedTo || <span className="text-slate-400 italic font-normal">Unassigned</span>}
 </span>
 </div>
 </td>

 {/* Dept/Scope */}
 <td className="px-4 py-3.5">
 {item.department && (
 <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800">
 {item.department}
 </span>
 )}
 </td>

 {/* Due Target */}
 <td className="px-4 py-3.5">
 <div className="flex flex-col">
 <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
 {item.dueDate ? format(parseISO(item.dueDate), "dd MMM yyyy") : "No Due Date"}
 </span>
 <span className={cn(
 "px-2 py-0.5 text-xs font-medium rounded-md mt-1 border border-solid self-start",
 getDueBadgeClass(item.dueDate, item.status)
 )}>
 {getDueText(item.dueDate, item.status)}
 </span>
 </div>
 </td>

 {/* Status dropdown */}
 <td className="px-4 py-3.5 text-center">
 <select
 value={item.status}
 onChange={(e) => handleUpdateSingleActionItemStatus(
 meeting, 
 item.id, 
 e.target.value as any
 )}
 className={cn(
 "px-3 py-1.5 rounded-xl text-xs font-medium  border text-center outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500",
 getStatusBadgeClass(item.status)
 )}
 >
 <option value="Pending">Pending</option>
 <option value="In Progress">In Progress</option>
 <option value="Completed">Completed</option>
 <option value="Cancelled">Cancelled</option>
 </select>
 </td>

 {/* Remarks col */}
 <td className="px-4 py-3.5">
 {editingRemarkItemId === item.id ? (
 <div className="flex items-center gap-2 max-w-xs">
 <input
 type="text"
 value={tempRemark}
 onChange={(e) => setTempRemark(e.target.value)}
 placeholder="မှတ်ချက်ရေးရန်..."
 className="px-2 py-1.5 min-w-[200px] border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none shadow-inner"
 />
 <button
 onClick={() => handleSaveSingleActionItemRemark(meeting, item.id)}
 className="p-1 px-2.5 bg-emerald-600 text-white rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400"
 >
 Save
 </button>
 <button
 onClick={() => setEditingRemarkItemId(null)}
 className="p-1 px-2.5 bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium "
 >
 Cancel
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-2 group cursor-pointer max-w-sm" onClick={() => {
 setEditingRemarkItemId(item.id);
 setTempRemark(item.remarks || "");
 }}>
 <span className={cn(
 "text-xs italic leading-relaxed break-all",
 item.remarks ? "text-slate-600 dark:text-slate-300 font-medium" : "text-slate-350"
 )}>
 {item.remarks || "No remark updates. Click to add progress. (တိုးတက်မှု မှတ်တမ်းတင်ရန်)"}
 </span>
 <Edit3 size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
 </div>
 )}
 </td>

 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 )}

 {/* 4. DETAILS DIALOG MODAL (Slick sliding pane style) */}
 <AnimatePresence>
 {selectedMeeting && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-white dark:bg-slate-900 p-0 w-full h-full sm:h-auto sm:max-w-3xl rounded-none sm:rounded-3xl overflow-hidden flex flex-col sm:max-h-[88vh] shadow-2xl relative"
 >
 {/* Top Banner details */}
 <div className="p-6 sm:p-8 border-b border-slate-100 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
 <div className="flex-1 mr-4">
 <div className="flex items-center gap-2 mb-2">
 <span className="text-xs font-mono font-medium text-slate-400 ">Meeting Minutes Detail</span>
 <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md">
 Real-time
 </span>
 </div>
 <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100 break-words whitespace-pre-wrap">
 {selectedMeeting.title}
 </h3>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={() => handleOpenCreateModal(selectedMeeting)}
 className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
 title="Edit minutes"
 >
 <Edit3 size={18} />
 </button>
 <button
 onClick={() => handleDeleteMeeting(selectedMeeting.id, selectedMeeting.title)}
 className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
 title="Delete Meeting Record"
 >
 <Trash2 size={18} />
 </button>
 <button 
 onClick={() => setSelectedMeeting(null)}
 className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
 >
 <XCircle size={22} />
 </button>
 </div>
 </div>

 {/* Scrollable details container */}
 <div className="overflow-y-auto p-6 sm:p-8 flex-1 space-y-6">
 
 {/* Meta details horizontal strip */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
 <div>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mb-1">Date</p>
 <p className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
 <Calendar size={12} className="text-slate-400" />
 {selectedMeeting.date ? format(parseISO(selectedMeeting.date), "dd MMM yyyy") : "No Date"}
 </p>
 </div>
 <div>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mb-1">Time</p>
 <p className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
 <Clock size={12} className="text-slate-400" />
 {selectedMeeting.time || "-"}
 </p>
 </div>
 <div>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mb-1">Location</p>
 <p className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 truncate">
 <MapPin size={12} className="text-slate-400" />
 {selectedMeeting.location || "-"}
 </p>
 </div>
 <div>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mb-1">Recorded By</p>
 <p className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 truncate text-indigo-600">
 <User size={12} className="text-slate-400" />
 {selectedMeeting.createdBy}
 </p>
 </div>
 </div>

 {/* Discussion summaries */}
 <div className="space-y-3">
 <h4 className="text-xs font-medium text-slate-400 ">Meeting Minutes Summary & Details</h4>
 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-3xl text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
 {selectedMeeting.content || <span className="text-slate-400 italic">အသေးစိတ်မှတ်ချက်များ ရေးသားထားခြင်းမရှိပါ။</span>}
 </div>
 </div>

 {/* Attendees lists */}
 {selectedMeeting.attendees?.length > 0 && (
 <div className="space-y-3">
 <h4 className="text-xs font-medium text-slate-400 ">Attendees (တက်ရောက်သူများ)</h4>
 <div className="flex flex-wrap gap-2">
 {selectedMeeting.attendees.map((attendee, idx) => (
 <span key={idx} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium rounded-full text-xs flex items-center gap-1">
 <User size={10} />
 {attendee}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Embedded action items / commitments list */}
 <div className="space-y-4 pt-4 border-t border-slate-100">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
 <ClipboardList size={14} className="text-indigo-600" />
 Action Items Generated ({selectedMeeting.actionItems?.length || 0})
 </h4>
 </div>

 {(!selectedMeeting.actionItems || selectedMeeting.actionItems.length === 0) ? (
 <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed text-slate-450 italic text-xs">
 ယခုအစည်းအဝေးမှ Action Item သတ်မှတ်ချက်များ မရှိသေးပါ။
 </div>
 ) : (
 <div className="space-y-4">
 {selectedMeeting.actionItems.map((item) => (
 <div key={item.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-150 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
 <div className="flex-1 space-y-1">
 <p className="font-medium text-slate-800 dark:text-slate-100 text-sm whitespace-pre-wrap">{item.task}</p>
 
 <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
 <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
 <User size={10} className="text-slate-400" />
 {item.assignedTo || "Unassigned"}
 </span>
 {item.department && (
 <span className="px-2 py-0.5 text-xs bg-slate-100 border border-slate-250 text-slate-500 dark:text-slate-400 font-medium rounded ">
 {item.department}
 </span>
 )}
 <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
 <Clock3 size={10} className="text-slate-400" />
 Due: {item.dueDate ? format(parseISO(item.dueDate), "dd MMM yyyy") : "None"}
 </span>
 </div>

 {/* Relative overdue label inside modal action items */}
 <p className={cn(
 "text-xs font-medium inline-block px-1.5 py-0.5 rounded",
 getDueBadgeClass(item.dueDate, item.status)
 )}>
 {getDueText(item.dueDate, item.status)}
 </p>
 </div>

 {/* Action controls */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-sm">
 <select
 value={item.status}
 onChange={(e) => handleUpdateSingleActionItemStatus(
 selectedMeeting, 
 item.id, 
 e.target.value as any
 )}
 className={cn(
 "px-3 py-1.5 rounded-xl text-xs font-medium border tracking-wider outline-none text-center cursor-pointer",
 getStatusBadgeClass(item.status)
 )}
 >
 <option value="Pending">Pending</option>
 <option value="In Progress">In Progress</option>
 <option value="Completed">Completed</option>
 <option value="Cancelled">Cancelled</option>
 </select>

 {/* Remarks progress log inside modal details */}
 {editingRemarkItemId === item.id ? (
 <div className="flex items-center gap-2 shrink-0">
 <input
 type="text"
 value={tempRemark}
 onChange={(e) => setTempRemark(e.target.value)}
 className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 border rounded text-xs"
 placeholder="Update remark..."
 />
 <button
 onClick={() => handleSaveSingleActionItemRemark(selectedMeeting, item.id)}
 className="p-1 px-2.5 bg-indigo-600 text-white rounded font-medium text-xs"
 >
 Save
 </button>
 <button
 onClick={() => { setEditingRemarkItemId(null); setTempRemark(""); }}
 className="p-1 px-2.5 bg-slate-200 text-slate-600 dark:text-slate-300 rounded font-medium text-xs"
 >
 Cancel
 </button>
 </div>
 ) : (
 <button
 onClick={() => { setEditingRemarkItemId(item.id); setTempRemark(item.remarks || ""); }}
 className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
 >
 {item.remarks ? "Edit Remark" : "Add Remark"}
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* 5. CREATE & EDIT MEETING MODAL DIALOG */}
 <AnimatePresence>
 {isCreateModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 30 }}
 className="bg-white dark:bg-slate-900 p-0 w-full h-full sm:h-auto sm:max-w-4xl rounded-none sm:rounded-3xl overflow-hidden flex flex-col sm:max-h-[92vh] shadow-2xl"
 >
 {/* Form Title Banner */}
 <div className="p-6 sm:p-8 border-b border-slate-100 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
 <div>
 <h3 className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-100 tracking-tight ">
 {isEditingMeeting ? "Edit Meeting Minutes" : "Record New Meeting Minutes"}
 </h3>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mt-1">
 အစည်းအဝေး ဆုံးဖြတ်ချက်များနှင့် follow-up action items များရေးသွင်းရန်
 </p>
 </div>
 <button 
 onClick={() => setIsCreateModalOpen(false)}
 className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
 >
 <XCircle size={22} />
 </button>
 </div>

 {/* Scrollable Form Body */}
 <form onSubmit={handleSaveMeeting} className="overflow-y-auto p-6 sm:p-8 flex-1 space-y-6">
 
 {/* Topic / Title */}
 <div className="space-y-1.5">
 <label className="text-xs md:text-xs text-slate-400 font-medium ">
 Meeting Topic (အစည်းအဝေး ခေါင်းစဉ်/အကြောင်းအရာ) *
 </label>
 <input
 type="text"
 required
 value={formTitle}
 onChange={(e) => setFormTitle(e.target.value)}
 placeholder="Weekly Operations Sync, IT Strategy Alignment..."
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm transition-colors focus:border-indigo-500 outline-none"
 />
 </div>

 {/* Sub Metadata controls */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
 {/* Date */}
 <div className="space-y-1.5">
 <label className="text-xs md:text-xs text-slate-400 font-medium ">
 Meeting Date *
 </label>
 <input
 type="date"
 required
 value={formDate}
 onChange={(e) => setFormDate(e.target.value)}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none transition-colors"
 />
 </div>

 {/* Time */}
 <div className="space-y-1.5">
 <label className="text-xs md:text-xs text-slate-400 font-medium ">
 Meeting Time
 </label>
 <input
 type="text"
 value={formTime}
 onChange={(e) => setFormTime(e.target.value)}
 placeholder="10:00 AM - 12:00 PM"
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none placeholder-slate-350"
 />
 </div>

 {/* Location */}
 <div className="space-y-1.5">
 <label className="text-xs md:text-xs text-slate-400 font-medium ">
 Location / Online Link / Room
 </label>
 <input
 type="text"
 value={formLocation}
 onChange={(e) => setFormLocation(e.target.value)}
 placeholder="Main Boardroom, Zoom Link..."
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none placeholder-slate-350"
 />
 </div>
 </div>

 {/* Attendees builder Section */}
 <div className="space-y-2.5">
 <label className="text-xs md:text-xs text-slate-400 font-medium block">
 Attendees (တက်ရောက်သူများ)
 </label>
 
 <div className="flex gap-2">
 <input
 type="text"
 placeholder="တက်ရောက်သူ အမည် သို့မဟုတ် ရာထူး ရေးပြီး Add နှိပ်ပါ..."
 value={attendeeInput}
 onChange={(e) => setAttendeeInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleAddAttendee();
 }
 }}
 className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none"
 />
 <button
 type="button"
 onClick={handleAddAttendee}
 className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-medium text-slate-500 dark:text-slate-400"
 >
 Add
 </button>
 </div>

 {/* Attendees List display */}
 {formAttendees.length > 0 && (
 <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 border rounded-2xl">
 {formAttendees.map((att, index) => (
 <span key={index} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-full text-xs flex items-center gap-1.5">
 {att}
 <button
 type="button"
 onClick={() => handleRemoveAttendee(index)}
 className="text-slate-400 hover:text-rose-500 font-medium text-xs shrink-0"
 >
 &times;
 </button>
 </span>
 ))}
 </div>
 )}
 </div>

 {/* Discussions details markdown input */}
 <div className="space-y-1.5">
 <label className="text-xs md:text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400">
 Discussion Content, Notes, Agreements (ဆွေးနွေးချက် အနှစ်ချုပ်များ)
 </label>
 <textarea
 rows={6}
 value={formContent}
 onChange={(e) => setFormContent(e.target.value)}
 placeholder="Write detailed notes here. What was resolved, discussed..."
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-sans whitespace-pre-wrap outline-none focus:border-indigo-500 focus:bg-white dark:bg-slate-900 resize-y"
 ></textarea>
 </div>

 {/* ACTION ITEMS INTERACTIVE ROW BUILDER */}
 <div className="space-y-4 pt-6 border-t border-slate-100">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300 ">
 Action Items & Follow-up Commitments (တာဝန်ချအပ်ခြင်းများ)
 </h4>
 <p className="text-xs text-slate-400 font-semibold tracking-wide block mt-0.5">
 အစည်းအဝေးမှ ဆုံးဖြတ်ပြီး ဆက်လက် Follow-up လုပ်ဆောင်ရမည့် လုပ်ငန်းစဥ်များ
 </p>
 </div>

 <button
 type="button"
 onClick={handleAddActionItem}
 className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1"
 >
 <Plus size={14} />
 Add Task
 </button>
 </div>

 {formActionItems.length === 0 ? (
 <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-150 text-slate-400 text-sm rounded-2xl italic">
 အစည်းအဝေးမှ တာဝန်ပေးချက်များ မရှိသေးပါ (Add Task ကိုနှိပ်၍ သတ်မှတ်ပါ)။
 </div>
 ) : (
 <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
 {formActionItems.map((item, idx) => (
 <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl relative flex flex-col md:flex-row gap-4 items-stretch md:items-end">
 
 <button
 type="button"
 onClick={() => handleRemoveActionItem(item.id)}
 className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
 title="Remove Task"
 >
 <Trash2 size={14} />
 </button>

 {/* Task Descr */}
 <div className="flex-1 space-y-1">
 <label className="text-xs text-slate-400 font-medium block">Task / Action Required *</label>
 <input
 type="text"
 required
 placeholder="Describe what needs to be done..."
 value={item.task}
 onChange={(e) => handleUpdateActionItemField(item.id, "task", e.target.value)}
 className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
 />
 </div>

 {/* Assigned To selection */}
 <div className="w-full md:w-1/4 space-y-1">
 <label className="text-xs text-slate-400 font-medium block">Assigned Staff</label>
 <input
 type="text"
 list="staff-list-mt"
 placeholder="Type name & select..."
 value={item.assignedTo}
 onChange={(e) => handleUpdateActionItemField(item.id, "assignedTo", e.target.value)}
 className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
 />
 <datalist id="staff-list-mt">
 {users.map((u, i) => (
 <option key={i} value={u.displayName || u.email || ""} />
 ))}
 </datalist>
 </div>

 {/* Department Scope Selection */}
 <div className="w-full md:w-1/5 space-y-1">
 <label className="text-xs text-slate-400 font-medium block">Scope / Department</label>
 <select
 value={item.department}
 onChange={(e) => handleUpdateActionItemField(item.id, "department", e.target.value)}
 className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
 >
 {DEPARTMENTS.map(d => (
 <option key={d} value={d}>{d}</option>
 ))}
 </select>
 </div>

 {/* Due date picker */}
 <div className="w-full md:w-1/5 space-y-1">
 <label className="text-xs text-slate-400 font-medium block">Target Due Date</label>
 <input
 type="date"
 value={item.dueDate}
 onChange={(e) => handleUpdateActionItemField(item.id, "dueDate", e.target.value)}
 className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
 />
 </div>

 </div>
 ))}
 </div>
 )}
 </div>

 {/* Form submit/cancel buttons */}
 <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
 <button
 type="button"
 onClick={() => setIsCreateModalOpen(false)}
 className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 transition-all shadow-md"
 >
 Save Minute & Publish Task (မှတ်တမ်း သိမ်းမည်)
 </button>
 </div>

 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 </div>
 );
}

// Visual mini analytics widget helper
function mt_analytics_cards(metrics: { totalMeetings: number; pending: number; inProgress: number; completed: number }) {
 const data = [
 { title: "Total Meetings", val: metrics.totalMeetings, desc: "Recorded अစည်းအဝေးများ", color: "border-slate-100 text-slate-800 dark:text-slate-100" },
 { title: "Pending Actions", val: metrics.pending, desc: "လုပ်ရန် ကျန်ရှိသည်", color: "border-slate-100 text-slate-500 dark:text-slate-400" },
 { title: "In Progress Actions", val: metrics.inProgress, desc: "လုပ်ဆောင်နေဆဲ", color: "border-indigo-100 text-indigo-600 bg-indigo-50/20" },
 { title: "Completed Actions", val: metrics.completed, desc: "ပြီးမြောက်ပြီးပါပြီ", color: "border-emerald-100 text-emerald-600 bg-emerald-50/20" }
 ];

 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
 {data.map((item, idx) => (
 <div key={idx} className={cn("bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs flex flex-col justify-between", item.color)}>
 <span className="text-xs text-slate-400 font-medium">{item.title}</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-medium">{item.val}</span>
 <span className="text-xs text-slate-400 font-medium">{item.desc}</span>
 </div>
 </div>
 ))}
 </div>
 );
}
