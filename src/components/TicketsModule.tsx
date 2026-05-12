import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Download, 
  Search, 
  Clock, 
  MapPin, 
  User, 
  X, 
  History,
  Bot,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { utils, writeFile } from "xlsx";
import { format } from "date-fns";
import { useAppStore } from "../store/useAppStore";
import { useKpiStore } from "../store/useKpiStore";
import { ITTicket, Priority, Status, ActionEntry } from "../types";
import { saveTicket, getDailyLog, saveDailyLog, deleteTicket } from "../services/firestoreService";
import { auth } from "../services/firebase";

// Helper for classes
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

const formatId = (id: string) => {
  if (!id) return "";
  if (id.length > 12) {
    return id.slice(0, 8).toUpperCase();
  }
  return id;
};

const isHistorical = (dateStr: string) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 30;
};

interface TicketsModuleProps {
  searchTerm: string;
  isAdmin: boolean;
}

export const TicketsModule: React.FC<TicketsModuleProps> = ({ searchTerm, isAdmin }) => {
  const { tickets } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITTicket | null>(null);
  const [newAction, setNewAction] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [newTicket, setNewTicket] = useState<Partial<ITTicket>>({
    priority: Priority.MEDIUM,
    status: Status.PENDING
  });

  // Auto-save logic
  useEffect(() => {
    const savedDraft = localStorage.getItem("it_ticket_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.problemType || draft.requesterName) {
          setNewTicket(prev => ({ ...prev, ...draft }));
          setIsAdding(true);
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
    return (
      (searchTerm === "" && ticketSearch === "") ||
      ticket.id.toLowerCase().includes(searchLower) ||
      ticket.problemType.toLowerCase().includes(searchLower) ||
      ticket.requesterName.toLowerCase().includes(searchLower) ||
      ticket.status.toLowerCase().includes(searchLower) ||
      ticket.priority.toLowerCase().includes(searchLower)
    );
  });

  const currentTickets = filteredTickets.filter(t => !isHistorical(t.requestTime));
  const historicalTickets = filteredTickets.filter(t => isHistorical(t.requestTime));

  const handleAddTicket = () => {
    if (!newTicket.problemType || !newTicket.requesterName) return;
    
    const ticket: Partial<ITTicket> = {
      problemType: newTicket.problemType!,
      priority: newTicket.priority as Priority,
      requestTime: new Date().toISOString(),
      requesterName: newTicket.requesterName!,
      requesterBranch: newTicket.requesterBranch || "Unknown",
      description: newTicket.description || "",
      actions: [],
      status: Status.PENDING,
    };

    saveTicket(ticket).then(() => {
      setIsAdding(false);
      setNewTicket({ priority: Priority.MEDIUM, status: Status.PENDING });
      localStorage.removeItem("it_ticket_draft");
    }).catch(err => {
      console.error("Failed to save ticket", err);
    });
  };

  const handleAddAction = (ticketId: string) => {
    if (!newAction.trim()) return;
    
    const entry: ActionEntry = {
      timestamp: new Date().toISOString(),
      performer: auth.currentUser?.email || "IT Agent",
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
          performer: auth.currentUser?.email || "Supervisor",
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
      
      useKpiStore.getState().incrementTask('it_support');

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

  const handleDeleteTicket = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this support log?")) return;
    
    try {
      await deleteTicket(ticketId);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error("Failed to delete ticket", err);
    }
  };

  const handleExportTickets = () => {
    const data = tickets.map(t => ({
      ID: t.id,
      Issue: t.problemType,
      Priority: t.priority,
      Requester: t.requesterName,
      Status: t.status,
      "Request Time": format(new Date(t.requestTime), "yyyy-MM-dd HH:mm:ss"),
      "Action History": t.actions.map(a => `[${format(new Date(a.timestamp), "HH:mm")}] ${a.performer}: ${a.action}`).join("; "),
      "Completed At": t.completedAt ? format(new Date(t.completedAt), "yyyy-MM-dd HH:mm:ss") : "-"
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "IT Support Log");
    writeFile(workbook, `IT_Support_Log_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center enterprise-card p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">IT Support Log (SOP-001)</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest leading-loose">Active nodes: {tickets.filter(t => t.status !== Status.COMPLETED).length}</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all w-48 lg:w-64"
            />
          </div>
          <button 
            onClick={handleExportTickets}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200"
          >
            <Download size={16} /> Export
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="uppercase tracking-widest text-slate-400 font-bold text-[9px]">
                <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10">Date</th>
                <th className="px-6 py-4 sticky left-[120px] bg-slate-50 z-10">Requester</th>
                <th className="px-6 py-4">Issue</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Action Taken</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { label: "Active Support Logs", items: currentTickets },
                { label: "Historical Records (>30 days)", items: historicalTickets }
              ].map((group) => (
                <React.Fragment key={group.label}>
                  {group.items.length > 0 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={6} className="px-6 py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{group.label}</td>
                    </tr>
                  )}
                  {group.items.map((ticket) => (
                    <tr 
                      key={ticket.id} 
                      onClick={() => setSelectedTicket(ticket)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                        <p className="text-[10px] text-slate-600 font-bold uppercase">{format(new Date(ticket.requestTime), "yyyy-MM-dd")}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{format(new Date(ticket.requestTime), "HH:mm:ss")}</p>
                      </td>
                      <td className="px-6 py-4 sticky left-[120px] bg-white group-hover:bg-slate-50 z-10">
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{ticket.requesterName}</span>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{formatId(ticket.id)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-1">{ticket.problemType}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                          ticket.priority === Priority.CRITICAL ? "bg-rose-50 text-rose-600 border-rose-100" : 
                          ticket.priority === Priority.HIGH ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {ticket.actions.length > 0 ? (
                          <div className="max-w-[200px]">
                            <p className="text-[10px] text-slate-500 italic line-clamp-1 font-medium">"{ticket.actions[ticket.actions.length - 1].action}"</p>
                            <p className="text-[8px] text-slate-400 uppercase font-bold mt-0.5 flex items-center gap-1">
                               <Clock size={8} /> {format(new Date(ticket.actions[ticket.actions.length - 1].timestamp), "HH:mm")} • IT Agent
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Pending assigned...</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            ticket.status === Status.COMPLETED ? "bg-emerald-50 text-emerald-600" : 
                            ticket.status === Status.IN_PROGRESS ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400 italic"
                          )}>
                            {ticket.status}
                          </span>
                          {isAdmin && (
                            <button 
                              onClick={(e) => handleDeleteTicket(e, ticket.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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
            <div 
              key={ticket.id} 
              onClick={() => setSelectedTicket(ticket)}
              className="w-full text-left p-4 hover:bg-slate-50 transition-colors active:bg-slate-100 cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{formatId(ticket.id)}</span>
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDeleteTicket(e, ticket.id)}
                      className="p-1 text-rose-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                  ticket.status === Status.COMPLETED ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                  ticket.status === Status.IN_PROGRESS ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-50 text-slate-400 italic border border-slate-200"
                )}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2">{ticket.problemType}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    ticket.priority === Priority.CRITICAL ? "bg-rose-500" : 
                    ticket.priority === Priority.HIGH ? "bg-amber-500" : "bg-slate-300"
                  )}></div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{ticket.requesterName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{format(new Date(ticket.requestTime), "HH:mm")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="enterprise-modal p-6 sm:p-8 w-full h-full sm:h-auto sm:max-w-md rounded-none sm:rounded-3xl overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-8 tracking-tight">System Node Registration</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Requester ID</label>
                  <input 
                    type="text" 
                    value={newTicket.requesterName || ""}
                    onChange={e => setNewTicket({...newTicket, requesterName: e.target.value})}
                    placeholder="Staff identifier..." 
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Branch / Store</label>
                  <input 
                    type="text" 
                    value={newTicket.requesterBranch || ""}
                    onChange={e => setNewTicket({...newTicket, requesterBranch: e.target.value})}
                    placeholder="e.g. Branch 3, Office..." 
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Issue Diagnostic</label>
                  <textarea 
                    rows={3}
                    value={newTicket.problemType || ""}
                    onChange={e => setNewTicket({...newTicket, problemType: e.target.value})}
                    placeholder="Brief summary..." 
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Detailed Description</label>
                  <textarea 
                    rows={3}
                    value={newTicket.description || ""}
                    onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                    placeholder="Full details of the issue..." 
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Priority Classification</label>
                  <select 
                    onChange={e => setNewTicket({...newTicket, priority: e.target.value as Priority})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value={Priority.LOW}>Low Intensity</option>
                    <option value={Priority.MEDIUM}>Standard</option>
                    <option value={Priority.HIGH}>Elevated</option>
                    <option value={Priority.CRITICAL}>Critical Override</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-10">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="w-full py-4 sm:py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors order-2 sm:order-1"
                >
                  Terminate
                </button>
                <button 
                  onClick={handleAddTicket}
                  className="enterprise-btn-primary w-full py-4 sm:py-3 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest order-1 sm:order-2"
                >
                  Confirm Log
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedTicket && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="enterprise-modal p-0 w-full h-full sm:h-auto sm:max-w-2xl rounded-none sm:rounded-3xl overflow-hidden flex flex-col sm:max-h-[85vh]"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{formatId(selectedTicket.id)}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                      selectedTicket.priority === Priority.CRITICAL ? "bg-rose-50 text-rose-600 border-rose-100" : 
                      selectedTicket.priority === Priority.HIGH ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      {selectedTicket.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight line-clamp-1">{selectedTicket.problemType}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDeleteTicket(e, selectedTicket.id)}
                      className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
                <section>
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <MapPin size={12} className="text-indigo-600" /> Requester Location
                      </p>
                      <p className="text-sm font-bold text-slate-800">{selectedTicket.requesterBranch || "Central Office"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <User size={12} className="text-indigo-600" /> Assigned To
                      </p>
                      <p className="text-sm font-bold text-slate-800 italic">{selectedTicket.assignedToName || "Pending Assignment"}</p>
                    </div>
                  </div>

                  {isAdmin && !selectedTicket.assignedTo && selectedTicket.status !== Status.COMPLETED && (
                    <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Assign Task to Agent</p>
                      <div className="flex flex-wrap gap-2">
                        {["IT supervisor", "Merchandising supervisor", "IT digital marketing", "IT Staff A", "IT Staff B", "Field Engineer", "Admin"].map(staff => (
                          <button 
                            key={staff}
                            onClick={() => handleAssignTicket(selectedTicket.id, staff.toLowerCase().replace(/ /g, '_'), staff)}
                            className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-indigo-600 hover:text-white"
                          >
                            Assign to {staff}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTicket.responseTime !== undefined && (
                    <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Supervisor KPI: Response Time</p>
                      <p className="text-sm font-black text-emerald-600">{selectedTicket.responseTime} mins</p>
                    </div>
                  )}

                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Detailed Signal Data</h4>
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-600 leading-relaxed italic mb-8">
                    {selectedTicket.description || "No supplemental diagnostic data provided by node."}
                  </div>

                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History size={14} className="text-indigo-600" />
                    Action History Cluster
                  </h4>
                  <div className="space-y-6">
                    {selectedTicket.actions.length === 0 ? (
                      <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                        <Bot size={32} strokeWidth={1} />
                        <p className="text-[10px] font-bold uppercase mt-3 tracking-widest italic text-center">
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
                              <p className="text-sm text-slate-600 leading-relaxed max-w-[80%]">{entry.action}</p>
                              <span className="text-[9px] font-mono text-slate-400 font-bold">{format(new Date(entry.timestamp), "HH:mm")}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2 px-2 py-0.5 bg-slate-50 w-fit rounded">Operator: {entry.performer}</p>
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
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-sm"
                    rows={2}
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleAddAction(selectedTicket.id)}
                      disabled={!newAction.trim()}
                      className="enterprise-btn-primary flex-1 py-3 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      Record Action
                    </button>
                    <button 
                      onClick={() => handleCompleteTicket(selectedTicket.id)}
                      className="py-3 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                      Close Node
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
