import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Plus, Search, Trash2, Edit3, CheckCircle2, 
  AlertCircle, RefreshCw, Calendar, Tag, Layers, 
  ExternalLink, UserCheck, Shield, Key, Eye, EyeOff, Copy, 
  Camera, HardDrive, Check, Clock, Laptop, ArrowUpDown, Filter, ChevronRight, X,
  AlertTriangle, Download
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { utils, writeFile } from 'xlsx';
import { toast } from 'react-hot-toast';
import { BackupLog, CCTVRequest, PasswordVaultEntry } from '../../types';
import { 
  fetchBackups, 
  saveBackup, 
  fetchCCTVRequests, 
  saveCCTVRequest, 
  getPasswordEntries, 
  savePasswordEntry, 
  deletePasswordEntry 
} from '../../services/securityService';
import { saveActivity } from '../../services/kpiService';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { cn } from '../../lib/utils';

export function SecurityModule({ backups, setBackups, requests, setRequests, searchTerm, isAdmin }: { 
 backups: BackupLog[], 
 setBackups: (b: BackupLog[]) => void,
 requests: CCTVRequest[],
 setRequests: (r: CCTVRequest[]) => void,
 searchTerm: string,
 isAdmin: boolean
}) {
 const [isAddingRequest, setIsAddingRequest] = useState(false);
 const [newRequest, setNewRequest] = useState<Partial<CCTVRequest>>({
 approvalStatus: "Pending"
 });

 const filteredRequests = requests.filter(req => {
 const searchLower = searchTerm.toLowerCase();
 return (
 req.id.toLowerCase().includes(searchLower) ||
 req.requester.toLowerCase().includes(searchLower) ||
 req.reason.toLowerCase().includes(searchLower) ||
 (req.approvedBy?.toLowerCase() || "").includes(searchLower) ||
 req.approvalStatus.toLowerCase().includes(searchLower)
 );
 });

 const handlePerformBackup = () => {
 const newBackup: Partial<BackupLog> = {
 date: format(new Date(), "yyyy-MM-dd"),
 storageType: "External Drive",
 status: "Success",
 performer: "IT User"
 };
 saveBackup(newBackup).catch(err => console.error("Backup trigger failed", err));
 };

 const handleAddRequest = () => {
 if (!newRequest.requester || !newRequest.reason || !newRequest.dateOfFootage) return;

 const request: Partial<CCTVRequest> = {
 requester: newRequest.requester!,
 reason: newRequest.reason!,
 dateOfFootage: newRequest.dateOfFootage!,
 approvalStatus: "Pending"
 };

 saveCCTVRequest(request).then(() => {
 setIsAddingRequest(false);
 setNewRequest({ approvalStatus: "Pending" });
 }).catch(err => console.error("Failed to add CCTV request", err));
 };

 const handleExportCCTV = () => {
 const data = requests.map(r => ({
 ID: r.id,
 Requester: r.requester,
 "Footage Date": r.dateOfFootage,
 Reason: r.reason,
 Status: r.approvalStatus,
 "Approved By": r.approvedBy || "-"
 }));

 const worksheet = utils.json_to_sheet(data);
 const workbook = utils.book_new();
 utils.book_append_sheet(workbook, worksheet, "CCTV Requests");
 writeFile(workbook, `CCTV_Request_Log_${format(new Date(), "yyyyMMdd")}.xlsx`);
 };

 return (
 <div className="space-y-6 lg:space-y-8 pb-20 lg:pb-0">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
 {/* Backup Logs */}
 <div className="space-y-4 lg:space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 enterprise-card p-5 lg:p-6">
 <div>
 <h2 className="text-base lg:text-lg font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
 <HardDrive size={18} className="text-indigo-600" />
 Data Integrity Cluster
 </h2>
 </div>
 {isAdmin && (
 <button 
 onClick={handlePerformBackup}
 className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-indigo-700 transition-all shadow-sm"
 >
 Trigger Backup
 </button>
 )}
 </div>
 <div className="enterprise-card overflow-hidden">
 {/* Desktop Table */}
 <div className="hidden sm:block overflow-x-auto">
 <table className="w-full text-left">
 <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
 <tr className="text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">Date</th>
 <th className="px-4 py-3.5">Node Path</th>
 <th className="px-4 py-3.5 text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {backups.map(log => (
 <tr key={log.id} className="hover:bg-slate-50 transition-colors">
 <td className="px-4 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono italic">{log.date}</td>
 <td className="px-4 py-3.5 text-xs font-medium text-slate-500 dark:text-slate-400 ">{log.storageType}</td>
 <td className="px-4 py-3.5 text-center">
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-emerald-600">
 <CheckCircle2 size={12} /> {log.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {/* Mobile View */}
 <div className="sm:hidden divide-y divide-slate-100">
 {backups.map(log => (
 <div key={log.id} className="p-4 flex flex-col gap-2">
 <div className="flex justify-between items-center">
 <span className="text-xs font-semibold text-slate-300 font-mono italic">{log.date}</span>
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-500/5">
 <CheckCircle2 size={10} /> {log.status}
 </span>
 </div>
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ">{log.storageType}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* CCTV Security Notice */}
 <div className="bg-red-500/10 text-white p-6 lg:p-8 rounded-3xl border border-red-500/20 relative overflow-hidden flex flex-col justify-center h-fit lg:h-auto">
 <AlertTriangle className="absolute -right-6 -top-6 w-24 lg:w-32 h-24 lg:h-32 text-red-500 opacity-20" />
 <div className="flex items-center gap-3 mb-4 lg:mb-6 relative z-10">
 <Camera size={24} className="text-red-400" />
 <h2 className="text-lg lg:text-xl font-medium tracking-tight">Security Protocol</h2>
 </div>
 <p className="text-xs lg:text-xs text-red-100/70 leading-relaxed mb-6 lg:mb-8 font-medium relative z-10 max-w-sm">
 CCTV review requires multi-stage authorization. 
 Any unauthorized review, copying, or sharing of footage is strictly PROHIBITED and will result in disciplinary action.
 </p>
 <div className="relative z-10">
 {isAdmin ? (
 <button 
 onClick={() => setIsAddingRequest(true)}
 className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 transition-all shadow-lg shadow-red-900/40"
 >
 Submit Footage Request
 </button>
 ) : (
 <p className="text-xs text-red-400 font-medium text-slate-500 dark:text-slate-400 italic border border-red-500/20 p-3 rounded-xl bg-red-500/5">
 Contact IT Supervisor for footage review.
 </p>
 )}
 </div>
 </div>
 </div>

 {/* CCTV Requests Table */}
 <div className="space-y-4 lg:space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 enterprise-card p-5 lg:p-6">
 <div>
 <h2 className="text-base lg:text-lg font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
 <Camera size={18} className="text-rose-500" />
 CCTV Request Log
 </h2>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-slate-500 dark:text-slate-400 mt-1">Management Review Required</p>
 </div>
 <button 
 onClick={handleExportCCTV}
 className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium  hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
 >
 <Download size={16} /> Export Logs
 </button>
 </div>
 <div className="enterprise-card overflow-hidden">
 {/* Desktop Table */}
 <div className="hidden lg:block overflow-x-auto">
 <table className="w-full text-left">
 <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
 <tr className="text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">ID</th>
 <th className="px-4 py-3.5">Requester</th>
 <th className="px-4 py-3.5">Footage Date</th>
 <th className="px-4 py-3.5">Reason</th>
 <th className="px-4 py-3.5 text-right">Approval</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredRequests.length === 0 ? (
 <tr>
 <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
 No matching footage requests found
 </td>
 </tr>
 ) : (
 filteredRequests.map(req => (
 <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
 <td className="px-4 py-3.5 text-xs font-mono font-medium text-slate-500 dark:text-slate-400">{req.id}</td>
 <td className="px-4 py-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 ">{req.requester}</td>
 <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono italic">{req.dateOfFootage}</td>
 <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 italic max-w-xs truncate">{req.reason}</td>
 <td className="px-4 py-3.5 text-right">
 <span className={cn(
 "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
 req.approvalStatus === "Approved" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
 req.approvalStatus === "Denied" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
 )}>
 {req.approvalStatus}
 </span>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 {/* Mobile View */}
 <div className="lg:hidden divide-y divide-slate-100">
 {filteredRequests.length === 0 ? (
 <div className="p-12 text-center text-slate-400 italic text-xs">
 No matching footage requests found
 </div>
 ) : (
 filteredRequests.map(req => (
 <div key={req.id} className="p-4 space-y-3 text-slate-600 dark:text-slate-300">
 <div className="flex justify-between items-start">
 <span className="text-xs font-mono font-medium text-slate-400">{req.id}</span>
 <span className={cn(
 "px-2 py-0.5 rounded text-xs font-medium border",
 req.approvalStatus === "Approved" ? "text-emerald-600 border-emerald-100" : 
 req.approvalStatus === "Denied" ? "text-rose-600 border-rose-100" : "text-amber-600 border-amber-100"
 )}>
 {req.approvalStatus}
 </span>
 </div>
 <div>
 <p className="text-xs font-medium text-slate-800 dark:text-slate-100 ">{req.requester}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-mono italic mt-1">Footage on: {req.dateOfFootage}</p>
 </div>
 <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">{req.reason}</p>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 <AnimatePresence>
 {isAddingRequest && (
 <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
 <motion.div 
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 20, opacity: 0 }}
 className="glass-panel p-6 sm:p-8 w-full h-full sm:h-auto sm:max-w-md shadow-2xl rounded-none sm:rounded-3xl overflow-y-auto"
 >
 <h3 className="text-xl font-medium text-white mb-6 lg:mb-8 tracking-tight flex items-center gap-2">
 <Camera size={20} className="text-red-400" />
 Evidence Review Request
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Requester Name</label>
 <input 
 type="text" 
 onChange={e => setNewRequest({...newRequest, requester: e.target.value})}
 placeholder="Staff identifier..." 
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Date of Footage</label>
 <input 
 type="date"
 onChange={e => setNewRequest({...newRequest, dateOfFootage: e.target.value})}
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10"
 />
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Justification / Reason</label>
 <textarea 
 rows={4}
 onChange={e => setNewRequest({...newRequest, reason: e.target.value})}
 placeholder="Provide specific reason for review..." 
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10 resize-none"
 />
 </div>
 <div className="flex flex-col sm:flex-row gap-3 mt-10">
 <button 
 onClick={() => setIsAddingRequest(false)}
 className="w-full py-4 sm:py-3 px-4 bg-white dark:bg-slate-900/5 text-slate-400 rounded-xl font-medium text-xs hover:bg-white dark:bg-slate-900/10 transition-colors order-2 sm:order-1"
 >
 Cancel
 </button>
 <button 
 onClick={handleAddRequest}
 className="w-full py-4 sm:py-3 px-4 bg-red-600 text-white rounded-xl font-medium text-xs hover:bg-red-500 transition-all shadow-lg shadow-red-900/40 order-1 sm:order-2"
 >
 Submit Request
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
}

