import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  MessageSquare, 
  ChevronRight, 
  Tag, 
  Send 
} from 'lucide-react';
import { ITTicket, Priority, Status, SystemSettings, ActionEntry } from '../types';
import { saveTicket } from '../services/firestoreService';
import { isHistorical } from '../lib/utils';
import { auth } from '../services/firebase';

interface TicketsModuleProps {
  tickets: ITTicket[];
  setTickets?: (t: ITTicket[]) => void;
  searchTerm?: string;
  isAdmin: boolean;
  settings?: SystemSettings;
  userProfile?: any;
}

export function TicketsModule({
  tickets,
  searchTerm = "",
  isAdmin,
  settings,
  userProfile
}: TicketsModuleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITTicket | null>(null);
  const [newAction, setNewAction] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterDept, setFilterDept] = useState("All");

  const [newTicket, setNewTicket] = useState<Partial<ITTicket>>({
    priority: Priority.MEDIUM,
    status: Status.PENDING,
    actions: []
  });

  const filteredTickets = tickets.filter(ticket => {
    const searchLower = (searchTerm || ticketSearch).toLowerCase();
    const matchesStatus = filterStatus === "All" || ticket.status === filterStatus;
    const matchesPriority = filterPriority === "All" || ticket.priority === filterPriority;
    const matchesDept = filterDept === "All" || ticket.department === filterDept;

    const matchesSearch = (searchTerm === "" && ticketSearch === "") ||
      ticket.id.toLowerCase().includes(searchLower) ||
      ticket.problemType.toLowerCase().includes(searchLower) ||
      ticket.requesterName.toLowerCase().includes(searchLower) ||
      ticket.status.toLowerCase().includes(searchLower) ||
      ticket.priority.toLowerCase().includes(searchLower);

    return matchesStatus && matchesPriority && matchesDept && matchesSearch;
  }).sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());

  const handleAddTicket = async () => {
    if (isSavingTicket) return;
    if (!newTicket.problemType || !newTicket.requesterName) return;

    const ticketPayload: Partial<ITTicket> = {
      problemType: newTicket.problemType.trim(),
      priority: newTicket.priority || Priority.MEDIUM,
      requestTime: new Date().toISOString(),
      requesterName: newTicket.requesterName.trim(),
      requesterBranch: newTicket.requesterBranch || "Central",
      department: newTicket.department || "IT",
      description: newTicket.description || "",
      actions: [],
      status: Status.PENDING,
    };

    setIsSavingTicket(true);
    try {
      await saveTicket(ticketPayload);
      setIsAdding(false);
      setNewTicket({ priority: Priority.MEDIUM, status: Status.PENDING, actions: [] });
    } catch (err) {
      console.error("Failed to save ticket", err);
    } finally {
      setIsSavingTicket(false);
    }
  };

  const handleAddAction = async (ticketId: string) => {
    if (!newAction.trim()) return;

    const entry: ActionEntry = {
      timestamp: new Date().toISOString(),
      performer: auth.currentUser?.displayName || auth.currentUser?.email || "IT Specialist",
      action: newAction.trim()
    };

    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!targetTicket) return;

    const updatedTicket: ITTicket = {
      ...targetTicket,
      actions: [...(targetTicket.actions || []), entry]
    };

    try {
      await saveTicket(updatedTicket);
      setSelectedTicket(updatedTicket);
      setNewAction("");
    } catch (err) {
      console.error("Failed to add action to ticket", err);
    }
  };

  const handleUpdateStatus = async (ticket: ITTicket, newStatus: Status) => {
    const updated = {
      ...ticket,
      status: newStatus,
      completedAt: newStatus === Status.COMPLETED ? new Date().toISOString() : ticket.completedAt
    };
    try {
      await saveTicket(updated);
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(updated);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">IT Support Tickets</h1>
          <p className="text-xs text-slate-500 mt-1">Manage incidents, requests, and helpdesk operations</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search tickets..."
            value={ticketSearch}
            onChange={(e) => setTicketSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="All">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="All">All Departments</option>
          <option value="IT">IT</option>
          <option value="Merchandising">Merchandising</option>
          <option value="Digital Marketing">Digital Marketing</option>
          <option value="Accounts">Accounts</option>
          <option value="Management">Management</option>
        </select>
      </div>

      {/* Tickets List & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <AlertCircle size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No tickets found</p>
              <p className="text-xs text-slate-500">Try adjusting your search criteria or create a new ticket.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              const priorityColors: Record<string, string> = {
                Critical: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
                High: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
                Medium: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
                Low: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
              };

              const statusColors: Record<string, string> = {
                Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
                Pending: 'bg-amber-50 text-amber-700 border-amber-200',
                Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
              };

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-xs font-mono text-slate-400 block">#{ticket.id.slice(0, 8)}</span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{ticket.problemType}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold border ${priorityColors[ticket.priority] || ''}`}>
                        {ticket.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold border ${statusColors[ticket.status] || ''}`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><User size={12} /> {ticket.requesterName}</span>
                      <span className="text-slate-400">•</span>
                      <span>{ticket.department || 'IT'}</span>
                    </div>
                    <span className="text-slate-400 text-2xs">{new Date(ticket.requestTime).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Ticket Drawer / Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-fit sticky top-6 space-y-4">
          {selectedTicket ? (
            <>
              <div>
                <span className="text-2xs font-mono text-slate-400">ID: {selectedTicket.id}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{selectedTicket.problemType}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTicket.description || 'No additional details provided.'}</p>
              </div>

              <div className="flex gap-2">
                {Object.values(Status).map(st => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedTicket, st)}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition-colors ${
                      selectedTicket.status === st 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Action Log History */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Action History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedTicket.actions && selectedTicket.actions.length > 0 ? (
                    selectedTicket.actions.map((act, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-0.5">
                        <div className="flex justify-between text-2xs text-slate-400">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{act.performer}</span>
                          <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200">{act.action}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-2xs text-slate-400 italic">No actions recorded yet.</p>
                  )}
                </div>

                {/* Add Action Input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Log action performed..."
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAction(selectedTicket.id)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleAddAction(selectedTicket.id)}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">Select a ticket from the list to view full details and action logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create IT Incident Ticket</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Issue Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POS Barcode scanner not responding"
                  value={newTicket.problemType || ""}
                  onChange={(e) => setNewTicket({ ...newTicket, problemType: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Requester Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Staff name"
                    value={newTicket.requesterName || ""}
                    onChange={(e) => setNewTicket({ ...newTicket, requesterName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as Priority })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Department</label>
                <select
                  value={newTicket.department || "IT"}
                  onChange={(e) => setNewTicket({ ...newTicket, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="IT">IT</option>
                  <option value="Merchandising">Merchandising</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Management">Management</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed notes regarding the malfunction or request..."
                  value={newTicket.description || ""}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTicket}
                disabled={isSavingTicket || !newTicket.problemType || !newTicket.requesterName}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                {isSavingTicket ? "Saving..." : "Create Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketsModule;
