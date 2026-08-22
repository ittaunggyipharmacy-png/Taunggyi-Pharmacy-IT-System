import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  Download, 
  Plus, 
  Activity, 
  AlertTriangle, 
  Users, 
  User, 
  Clock, 
  Edit, 
  X, 
  RefreshCw, 
  MapPin, 
  History, 
  Bot, 
  Settings 
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { utils, writeFile } from 'xlsx';
import { ITTicket, Priority, Status, ActionEntry, UserRole, SystemSettings } from '../../types';
import { saveTicket, deleteTicket } from '../../services/ticketService';
import { getDailyLog, saveDailyLog } from '../../services/kpiService';
import { safeFormat, isHistorical, formatId } from '../../utils/file';
import { cn } from '../../lib/utils';
import { SearchableDropdown } from '../../components/SearchableDropdown';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { SupervisorEditModal } from './components/SupervisorEditModal';

interface TicketsModuleProps {
  tickets: ITTicket[];
  setTickets: React.Dispatch<React.SetStateAction<ITTicket[]>> | ((t: ITTicket[]) => void);
  searchTerm: string;
  isAdmin: boolean;
  settings: SystemSettings;
  userProfile: any;
}

export function TicketsModule({ 
  tickets, 
  setTickets, 
  searchTerm, 
  isAdmin, 
  settings, 
  userProfile 
}: TicketsModuleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITTicket | null>(null);
  const [newAction, setNewAction] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  
  // Advanced Edit State
  const [isAdvancedEditing, setIsAdvancedEditing] = useState(false);
  const [advEditTicket, setAdvEditTicket] = useState<ITTicket | null>(null);
  const isSupervisor = userProfile?.role === UserRole.IT_SUPERVISOR || userProfile?.role === UserRole.IT_SUPERVISOR_CAPS || isAdmin;
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [filterAssigned, setFilterAssigned] = useState("All");

  const [newTicket, setNewTicket] = useState<Partial<ITTicket>>({
    priority: Priority.MEDIUM,
    status: Status.PENDING
  });

  // Auto-save logic
  useEffect(() => {
    setIsAdding(false);
    const savedDraft = localStorage.getItem("it_ticket_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.problemType || draft.requesterName) {
          setNewTicket(prev => ({ ...prev, ...draft }));
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isAdding) {
      localStorage.setItem("it_ticket_draft", JSON.stringify(newTicket));
    }
  }, [newTicket, isAdding]);

  const filteredTickets = tickets.filter(ticket => {
    const searchLower = (searchTerm || ticketSearch).toLowerCase();
    
    const matchesStatus = filterStatus === "All" || ticket.status === filterStatus;
    const matchesPriority = filterPriority === "All" || ticket.priority === filterPriority;
    const matchesDept = filterDept === "All" || ticket.department === filterDept;
    const matchesAssigned = filterAssigned === "All" || ticket.assignedToName === filterAssigned;

    const matchesSearch = (searchTerm === "" && ticketSearch === "") ||
      ticket.id.toLowerCase().includes(searchLower) ||
      ticket.problemType.toLowerCase().includes(searchLower) ||
      ticket.requesterName.toLowerCase().includes(searchLower) ||
      ticket.status.toLowerCase().includes(searchLower) ||
      ticket.priority.toLowerCase().includes(searchLower);

    return matchesStatus && matchesPriority && matchesDept && matchesAssigned && matchesSearch;
  }).sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());

  const currentTickets = filteredTickets.filter(t => !isHistorical(t.requestTime));
  const historicalTickets = filteredTickets.filter(t => isHistorical(t.requestTime));

  const handleAddTicket = () => {
    if (isSavingTicket) return;
    if (!newTicket.problemType || !newTicket.requesterName) return;
    
    const ticket: Partial<ITTicket> = {
      problemType: newTicket.problemType!,
      priority: newTicket.priority as Priority,
      requestTime: new Date().toISOString(),
      requesterName: newTicket.requesterName!,
      requesterBranch: newTicket.requesterBranch || "Unknown",
      department: newTicket.department || "IT",
      description: newTicket.description || "",
      actions: [],
      status: Status.PENDING,
    };

    setIsSavingTicket(true);
    saveTicket(ticket).then(() => {
      setIsAdding(false);
      setNewTicket({ priority: Priority.MEDIUM, status: Status.PENDING });
      localStorage.removeItem("it_ticket_draft");
    }).catch(err => {
      console.error("Failed to save ticket", err);
    }).finally(() => {
      setIsSavingTicket(false);
    });
  };

  const handleAddAction = (ticketId: string) => {
    if (!newAction.trim()) return;
    
    const entry: ActionEntry = {
      timestamp: new Date().toISOString(),
      performer: userProfile?.displayName || userProfile?.email || "IT Agent",
      action: newAction.trim()
    };

    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!targetTicket) return;

    const updatedTicket = {
      ...targetTicket,
      actions: [...targetTicket.actions, entry],
      status: targetTicket.status === Status.PENDING ? Status.IN_PROGRESS : targetTicket.status
    };

    saveTicket(updatedTicket).then(() => {
      setNewAction("");
      setSelectedTicket(updatedTicket);
    }).catch(err => {
      console.error("Failed to add action", err);
    });
  };

  const handleAssignTicket = async (ticketId: string, userId: string, userName: string) => {
    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!targetTicket) return;

    const requestTime = new Date(targetTicket.requestTime).getTime();
    const assignmentTime = new Date().getTime();
    const responseTimeInMinutes = Math.round((assignmentTime - requestTime) / 60000);

    const updatedTicket = {
      ...targetTicket,
      assignedTo: userId,
      assignedToName: userName,
      responseTime: responseTimeInMinutes,
      status: Status.IN_PROGRESS,
      actions: [
        ...targetTicket.actions,
        {
          timestamp: new Date().toISOString(),
          performer: userProfile?.displayName || userProfile?.email || "Supervisor",
          action: `Ticket assigned to ${userName}. Response time: ${responseTimeInMinutes} mins.`
        }
      ]
    };

    try {
      await saveTicket(updatedTicket);
      setSelectedTicket(updatedTicket);

      // Update Daily KPI
      const today = format(new Date(), "yyyy-MM-dd");
      const logId = `${today}_${userId}`;
      const log = await getDailyLog(logId);
      const tasks = log?.tasks || {};
      tasks["it_support"] = (Number(tasks["it_support"]) || 0) + 1;
      
      await saveDailyLog({
        id: logId,
        date: today,
        userId: userId,
        tasks: tasks
      });
    } catch (err) {
      console.error("Failed to assign ticket or update KPI", err);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  const handleCompleteTicket = (ticketId: string) => {
    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!targetTicket) return;

    const updatedTicket = {
      ...targetTicket,
      status: Status.COMPLETED,
      completedAt: new Date().toISOString()
    };

    saveTicket(updatedTicket).then(() => {
      setSelectedTicket(updatedTicket);
    }).catch(err => {
      console.error("Failed to complete ticket", err);
    });
  };

  const handleDeleteTicket = (ticketId: string) => {
    if (!isAdmin) return;
    setTicketToDelete(ticketId);
    setShowDeleteModal(true);
  };

  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      await deleteTicket(ticketToDelete);
      setSelectedTicket(null);
      toast.success("IT Log record purged successfully.");
    } catch (err) {
      console.error("Failed to delete ticket", err);
      toast.error("Protocol Violation: Deletion failed.");
    } finally {
      setShowDeleteModal(false);
      setTicketToDelete(null);
    }
  };

  const handleExportTickets = () => {
    const data = filteredTickets.map(t => ({
      ID: String(filteredTickets.indexOf(t) + 1).padStart(5, '0'),
      Issue: t.problemType,
      Priority: t.priority,
      Requester: t.requesterName,
      Department: t.department || "-",
      "Assigned To": t.assignedToName || "-",
      Status: t.status,
      "Request Time": safeFormat(t.requestTime, "yyyy-MM-dd HH:mm:ss"),
      "Action History": t.actions.map(a => `[${safeFormat(a.timestamp, "HH:mm")}] ${a.performer}: ${a.action}`).join("; "),
      "Completed At": t.completedAt ? safeFormat(t.completedAt, "yyyy-MM-dd HH:mm:ss") : "-"
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "IT Support Log");
    writeFile(workbook, `IT_Support_Log_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 enterprise-card p-6">
        <div>
          <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ClipboardList size={20} className="text-indigo-600" />
            IT Support Log (SOP-001)
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium tracking-[0.2em]">Ticketing & Resolution Tracking</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={handleExportTickets}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:border-indigo-400 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <Download size={14} /> Export
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Plus size={14} /> New Entry
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Ticket Filtering */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 enterprise-card p-6">
        <div className="col-span-1">
          <SearchableDropdown 
            label="Status Cluster"
            placeholder="All Active Tickets"
            options={Object.values(Status)}
            value={filterStatus}
            onChange={setFilterStatus}
            icon={Activity}
          />
        </div>
        <div className="col-span-1">
          <SearchableDropdown 
            label="Priority Tier"
            placeholder="All Priority Levels"
            options={Object.values(Priority)}
            value={filterPriority}
            onChange={setFilterPriority}
            icon={AlertTriangle}
          />
        </div>
        <div className="col-span-1">
          <SearchableDropdown 
            label="Department View"
            placeholder="All Departments"
            options={settings.departments}
            value={filterDept}
            onChange={setFilterDept}
            icon={Users}
          />
        </div>
        <div className="col-span-1">
          <SearchableDropdown 
            label="Assigned Agent"
            placeholder="All Personnel"
            options={Array.from(new Set(tickets.map(t => t.assignedToName).filter(Boolean))) as string[]}
            value={filterAssigned}
            onChange={setFilterAssigned}
            icon={User}
          />
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <tr className=" text-[#475569] dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <th className="px-4 py-3.5">DATE</th>
                <th className="px-4 py-3.5">REQUESTER</th>
                <th className="px-4 py-3.5 text-center">DEPT</th>
                <th className="px-4 py-3.5">ISSUE</th>
                <th className="px-4 py-3.5">PRIORITY</th>
                <th className="px-4 py-3.5">ACTION TAKEN</th>
                <th className="px-4 py-3.5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { label: "Active Support Logs", items: currentTickets },
                { label: "Historical Records (>30 days)", items: historicalTickets }
              ].map((group) => (
                <React.Fragment key={group.label}>
                  {group.items.length > 0 && (
                    <tr className="bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td colSpan={7} className="px-6 py-2 text-xs font-medium text-indigo-600 ">{group.label}</td>
                    </tr>
                  )}
                  {group.items.map((ticket) => (
                    <tr 
                      key={ticket.id} 
                      onClick={() => setSelectedTicket(ticket)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium ">{safeFormat(ticket.requestTime, "yyyy-MM-dd")}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{safeFormat(ticket.requestTime, "HH:mm:ss")}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-indigo-600 font-medium">{ticket.requesterName}</span>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{formatId(ticket.id)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium ">
                        {ticket.department || "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors line-clamp-1">{ticket.problemType}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium border",
                          ticket.priority === Priority.CRITICAL ? "bg-rose-50 text-rose-600 border-rose-100" : 
                          ticket.priority === Priority.HIGH ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                        )}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {ticket.actions.length > 0 ? (
                          <div className="max-w-[200px]">
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1 font-medium">"{ticket.actions[ticket.actions.length - 1].action}"</p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                              <Clock size={8} /> {safeFormat(ticket.actions[ticket.actions.length - 1].timestamp, "HH:mm")} • IT Agent
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending assigned...</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {isSupervisor && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdvEditTicket(ticket);
                                setIsAdvancedEditing(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Advanced Edit (Supervisor Only)"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                            ticket.status === Status.COMPLETED ? "bg-emerald-50 text-emerald-600" : 
                            ticket.status === Status.IN_PROGRESS ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400 italic"
                          )}>
                            {ticket.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filteredTickets.map((ticket) => (
            <button 
              key={ticket.id} 
              onClick={() => setSelectedTicket(ticket)}
              className="w-full text-left p-4 hover:bg-slate-50 transition-colors active:bg-slate-100"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-medium text-slate-400">{formatId(ticket.id)}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  ticket.status === Status.COMPLETED ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                  ticket.status === Status.IN_PROGRESS ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-50 text-slate-400 italic border border-slate-200 dark:border-slate-800"
                )}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2 line-clamp-2">{ticket.problemType}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    ticket.priority === Priority.CRITICAL ? "bg-rose-500" : 
                    ticket.priority === Priority.HIGH ? "bg-amber-500" : "bg-slate-300"
                  )}></div>
                  <span className="text-xs text-slate-400 font-medium tracking-widest">{ticket.requesterName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={12} />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{safeFormat(ticket.requestTime, "HH:mm")}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div 
            onClick={() => setIsAdding(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="enterprise-modal p-6 sm:p-8 w-full h-full sm:h-auto sm:max-w-2xl md:max-w-3xl max-h-[90vh] rounded-none sm:rounded-3xl overflow-y-auto relative shadow-2xl"
            >
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-8 tracking-tight italic border-l-4 border-indigo-600 pl-4">System Node Registration</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Requester ID</label>
                    <input 
                      type="text" 
                      value={newTicket.requesterName || ""}
                      onChange={e => setNewTicket({...newTicket, requesterName: e.target.value})}
                      placeholder="Staff identifier..." 
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Department</label>
                    <select 
                      value={newTicket.department || ""}
                      onChange={e => setNewTicket({...newTicket, department: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Department</option>
                      {settings.departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Branch / Store</label>
                    <input 
                      type="text" 
                      value={newTicket.requesterBranch || ""}
                      onChange={e => setNewTicket({...newTicket, requesterBranch: e.target.value})}
                      placeholder="e.g. Branch 3, Office..." 
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Priority Classification</label>
                    <select 
                      onChange={e => setNewTicket({...newTicket, priority: e.target.value as Priority})}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value={Priority.LOW}>Low Intensity</option>
                      <option value={Priority.MEDIUM}>Standard</option>
                      <option value={Priority.HIGH}>Elevated</option>
                      <option value={Priority.CRITICAL}>Critical Override</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Issue Diagnostic</label>
                  <textarea 
                    rows={3}
                    value={newTicket.problemType || ""}
                    onChange={e => setNewTicket({...newTicket, problemType: e.target.value})}
                    placeholder="Brief summary..." 
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Detailed Description</label>
                  <textarea 
                    rows={3}
                    value={newTicket.description || ""}
                    onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                    placeholder="Full details of the issue..." 
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-10">
                <button 
                  onClick={() => setIsAdding(false)}
                  disabled={isSavingTicket}
                  className="w-full py-4 sm:py-3 px-4 bg-slate-100 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-200 transition-colors order-2 sm:order-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Terminate
                </button>
                <button 
                  onClick={handleAddTicket}
                  disabled={isSavingTicket}
                  className="enterprise-btn-primary w-full py-4 sm:py-3 px-4 rounded-xl font-medium text-xs order-1 sm:order-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingTicket ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Confirm Log"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedTicket && (
          <div 
            onClick={() => setSelectedTicket(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="enterprise-modal p-0 w-full h-full sm:h-auto sm:max-w-2xl rounded-none sm:rounded-3xl overflow-hidden flex flex-col sm:max-h-[85vh] shadow-2xl"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono font-medium text-slate-400">{formatId(selectedTicket.id)}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium border",
                      selectedTicket.priority === Priority.CRITICAL ? "bg-rose-50 text-rose-600 border-rose-100" : 
                      selectedTicket.priority === Priority.HIGH ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                    )}>
                      {selectedTicket.priority} Priority
                    </span>
                    {isSupervisor && (
                      <button 
                        onClick={() => {
                          setAdvEditTicket(selectedTicket);
                          setIsAdvancedEditing(true);
                        }}
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-medium hover:bg-indigo-600 hover:text-white transition-all ml-2"
                      >
                        <Settings size={10} /> Advanced Edit
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-100 tracking-tight break-words whitespace-pre-wrap">{selectedTicket.problemType}</h3>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8 custom-scrollbar bg-white dark:bg-slate-900">
                <section>
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <MapPin size={12} className="text-indigo-600" /> Requester Location
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedTicket.requesterBranch || "Central Office"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <User size={12} className="text-indigo-600" /> Assigned To
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 italic">{selectedTicket.assignedToName || "Pending Assignment"}</p>
                    </div>
                  </div>

                  {!selectedTicket.assignedTo && selectedTicket.status !== Status.COMPLETED && (
                    <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                      <p className="text-xs font-medium text-indigo-600 mb-3">Assign Task to Agent</p>
                      <div className="flex flex-wrap gap-2">
                        {["IT Supervisor", "Merchandising Supervisor", "IT Digital Marketing"].map(staff => (
                          <button 
                            key={staff}
                            onClick={() => handleAssignTicket(selectedTicket.id, staff.toLowerCase().replace(/\s+/g, '_'), staff)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-medium transition-all hover:bg-indigo-600 hover:text-white"
                          >
                            Assign to {staff}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTicket.responseTime !== undefined && (
                    <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                      <p className="text-xs font-medium text-emerald-600 ">Supervisor KPI: Response Time</p>
                      <p className="text-sm font-medium text-emerald-600">{selectedTicket.responseTime} mins</p>
                    </div>
                  )}

                  <h4 className="text-xs font-medium text-slate-400 mb-4">Detailed Signal Data</h4>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic mb-8">
                    {selectedTicket.description || "No supplemental diagnostic data provided by node."}
                  </div>

                  <h4 className="text-xs font-medium text-slate-400 mb-6 flex items-center gap-2">
                    <History size={14} className="text-indigo-600" />
                    Action History Cluster
                  </h4>
                  <div className="space-y-6">
                    {selectedTicket.actions.length === 0 ? (
                      <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                        <Bot size={32} strokeWidth={1} />
                        <p className="text-xs font-medium mt-3 tracking-widest italic text-center">
                          No diagnostic entries found.
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-8">
                        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-500/30 via-slate-100 to-transparent"></div>
                        {selectedTicket.actions.map((entry, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[27px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
                            <div className="flex justify-between items-start">
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-[80%]">{entry.action}</p>
                              <span className="text-xs font-mono text-slate-400 font-medium">{safeFormat(entry.timestamp, "HH:mm")}</span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-2 px-2 py-0.5 bg-slate-50 w-fit rounded">Operator: {entry.performer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {selectedTicket.status !== Status.COMPLETED && (
                <div className="p-8 border-t border-slate-100 bg-slate-50 space-y-4">
                  <textarea 
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    placeholder="Input systematic action taken..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-sm"
                    rows={2}
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleAddAction(selectedTicket.id)}
                      disabled={!newAction.trim()}
                      className="enterprise-btn-primary flex-1 py-3 px-6 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 disabled:opacity-50"
                    >
                      Record Action
                    </button>
                    <button 
                      onClick={() => handleCompleteTicket(selectedTicket.id)}
                      className="py-3 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-emerald-100 transition-all"
                    >
                      Close Node
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteTicket(selectedTicket.id)}
                        className="py-3 px-6 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-rose-100 transition-all"
                      >
                        Delete Node
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTicketToDelete(null);
        }}
        onConfirm={confirmDeleteTicket}
        title="Protocol: Record Deletion"
        message="Are you sure you want to permanently remove this IT Support Log record? This action will void the digital audit trail for this specific request."
        confirmText="Confirm Void"
      />

      {/* SUPERVISOR ADVANCED EDIT MODAL */}
      <AnimatePresence>
        {isAdvancedEditing && advEditTicket && (
          <SupervisorEditModal 
            ticket={advEditTicket}
            isOpen={isAdvancedEditing}
            onClose={() => {
              setIsAdvancedEditing(false);
              setAdvEditTicket(null);
            }}
            onSave={async (updatedTicket) => {
              try {
                await saveTicket(updatedTicket);
                const nextList = tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t);
                (setTickets as any)(nextList);
                if (selectedTicket?.id === updatedTicket.id) {
                  setSelectedTicket(updatedTicket);
                }
                setIsAdvancedEditing(false);
                setAdvEditTicket(null);
                toast.success("Ticket override successful. Master database updated.");
              } catch (error) {
                console.error("Advanced edit failed", error);
                toast.error("Override failed: Integrity check error.");
              }
            }}
            settings={settings}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
export default TicketsModule;
