import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';
import { ITTicket, Status, SystemSettings } from '../../../types';
import { formatId, safeFormat } from '../../../utils/file';

interface SupervisorEditModalProps {
  ticket: ITTicket;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: ITTicket) => Promise<void>;
  settings: SystemSettings;
}

export function SupervisorEditModal({ 
  ticket, 
  isOpen, 
  onClose, 
  onSave, 
  settings: _settings 
}: SupervisorEditModalProps) {
  const [formData, setFormData] = useState<ITTicket>({ ...ticket });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleActionEdit = (index: number, newText: string) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = { ...updatedActions[index], action: newText };
    setFormData({ ...formData, actions: updatedActions });
  };

  const toDatetimeLocal = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const fromDatetimeLocal = (localString: string) => {
    if (!localString) return "";
    try {
      return new Date(localString).toISOString();
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-600 sm:bg-white dark:bg-slate-900 dark:sm:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 dark:text-white leading-none">Supervisor Override</h3>
              <p className="text-xs font-medium text-slate-400 mt-2 ">{formatId(ticket.id)} • Advanced Logic Control</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8 custom-scrollbar">
          {/* Core Identity */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 px-1">Problem Node</label>
              <input 
                type="text" 
                value={formData.problemType}
                onChange={e => setFormData({ ...formData, problemType: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 px-1">Current Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium text-indigo-600"
              >
                {(Object.values(Status) as Status[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Location & Requester */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 px-1">Requester Name</label>
              <input 
                type="text" 
                value={formData.requesterName}
                onChange={e => setFormData({ ...formData, requesterName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 px-1">Department</label>
              <input 
                type="text" 
                value={formData.department || ""}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                placeholder="Assign department..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          {/* Temporal Overrides */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1">Request / Assign Date & Time</label>
              <input 
                type="datetime-local" 
                value={toDatetimeLocal(formData.requestTime)}
                onChange={e => {
                  const iso = fromDatetimeLocal(e.target.value);
                  if (iso) {
                    setFormData({ ...formData, requestTime: iso });
                  }
                }}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1">Completed Date & Time</label>
              <input 
                type="datetime-local" 
                value={toDatetimeLocal(formData.completedAt)}
                onChange={e => {
                  const iso = fromDatetimeLocal(e.target.value);
                  setFormData({ ...formData, completedAt: iso || undefined });
                }}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
              />
            </div>
          </div>

          {/* Extra Diagnostics */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 px-1">Baseline Description</label>
            <textarea 
              value={formData.description || ""}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
            />
          </div>

          {/* Action History Editing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400 px-1">Action Log History</label>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-medium ">Supervisor Override Active</span>
            </div>
            <div className="space-y-3">
              {formData.actions.map((action, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-500 ">{action.performer}</span>
                    <span className="text-xs font-mono text-slate-400">{safeFormat(action.timestamp, "yyyy-MM-dd HH:mm")}</span>
                  </div>
                  <textarea 
                    value={action.action}
                    onChange={e => handleActionEdit(idx, e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-600 dark:text-slate-300 focus:outline-none resize-none leading-relaxed"
                    rows={2}
                  />
                </div>
              ))}
              {formData.actions.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic">No actions recorded on this node.</div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-medium  hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? "Executing Protocol..." : "Commit Override"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
