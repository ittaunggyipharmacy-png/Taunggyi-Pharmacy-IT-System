import React, { useState } from "react";
import { 
 Calendar,
 CreditCard,
 Plus,
 Info,
 GripVertical,
 Edit2,
 Trash2,
 RefreshCw,
 X,
 ExternalLink,
 Phone,
 ClipboardList,
 Check,
 AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { RenewalRecord } from "../types";
import { saveRenewal, deleteRenewal, updateRenewalOrder } from "../services/firestoreService";
import { toast } from "react-hot-toast";

interface RenewalsModuleProps {
 renewals: RenewalRecord[];
 setRenewals: (r: RenewalRecord[]) => void;
 isAdmin: boolean;
}

export function RenewalsModule({ renewals, setRenewals, isAdmin }: RenewalsModuleProps) {
 const [isAdding, setIsAdding] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [infoRenewal, setInfoRenewal] = useState<RenewalRecord | null>(null);
 const [newRenewal, setNewRenewal] = useState<Partial<RenewalRecord>>({
 currency: "MMK",
 billingCycle: "Yearly",
 requiredDocuments: []
 });

 const [draggedId, setDraggedId] = useState<string | null>(null);

 const [dropTarget, setDropTarget] = useState<{
 id: string;
 position: "before" | "after";
 } | null>(null);

 const getStatus = (expireDate: string) => {
 if (!expireDate) return "Active";
 const now = new Date();
 const expire = new Date(expireDate);
 const diff = expire.getTime() - now.getTime();
 const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

 if (days < 0) return "Expired";
 if (days <= 30) return "Expiring Soon";
 return "Active";
 };

 const getStatusColor = (expireDate: string) => {
 const status = getStatus(expireDate);
 if (status === "Expired") return "text-rose-600 bg-rose-50 border-rose-100";
 if (status === "Expiring Soon") return "text-amber-600 bg-amber-50 border-amber-100";
 return "text-emerald-600 bg-emerald-50 border-emerald-100";
 };

 const upcomingRenewals = renewals
 .filter(r => getStatus(r.expireDate) === "Expiring Soon" || getStatus(r.expireDate) === "Expired")
 .sort((a, b) => new Date(a.expireDate).getTime() - new Date(b.expireDate).getTime());

 const totalUpcomingCost = upcomingRenewals
 .filter(r => r.currency === "MMK")
 .reduce((sum, r) => sum + r.price, 0);

 const handleSave = () => {
 if (!isAdmin || !newRenewal.serviceName || !newRenewal.shopName || !newRenewal.expireDate || !newRenewal.price) return;
 
 // Assign orderIndex for new records to be at the end of the list
 const maxOrder = renewals.reduce((max, r) => {
 const o = typeof r.orderIndex === 'number' ? r.orderIndex : 0;
 return o > max ? o : max;
 }, 0);

 const renewal: Partial<RenewalRecord> = {
 ...newRenewal,
 id: editingId || undefined,
 price: Number(newRenewal.price),
 status: getStatus(newRenewal.expireDate!) as any,
 orderIndex: editingId ? (newRenewal.orderIndex ?? maxOrder + 1) : maxOrder + 1,
 };
 
 saveRenewal(renewal).then(() => {
 setIsAdding(false);
 setEditingId(null);
 setNewRenewal({ currency: "MMK", billingCycle: "Yearly", requiredDocuments: [] });
 }).catch(err => console.error("Failed to save renewal", err));
 };

 const startEdit = (r: RenewalRecord) => {
 setNewRenewal(r);
 setEditingId(r.id);
 setIsAdding(true);
 };

 const toggleDoc = (doc: string) => {
 const docs = newRenewal.requiredDocuments || [];
 if (docs.includes(doc)) {
 setNewRenewal({ ...newRenewal, requiredDocuments: docs.filter(d => d !== doc) });
 } else {
 setNewRenewal({ ...newRenewal, requiredDocuments: [...docs, doc] });
 }
 };

 const sortedRenewals = [...renewals].sort((a, b) => {
 const orderA = typeof a.orderIndex === 'number' ? a.orderIndex : 0;
 const orderB = typeof b.orderIndex === 'number' ? b.orderIndex : 0;
 if (orderA !== orderB) return orderA - orderB;
 return new Date(a.expireDate).getTime() - new Date(b.expireDate).getTime();
 });

 const handleDelete = async (id: string) => {
 if (!isAdmin) return;
 try {
 await deleteRenewal(id);
 toast.success("Renewal record deleted successfully");
 } catch (err) {
 console.error("Failed to delete renewal", err);
 toast.error("Failed to delete renewal record");
 }
 };

 const clearDragState = () => {
 setDraggedId(null);
 setDropTarget(null);
 };

 const handleDragStart = (
 event: React.DragEvent<HTMLButtonElement>,
 id: string
 ) => {
 if (!isAdmin) return;

 setDraggedId(id);
 event.dataTransfer.effectAllowed = "move";
 event.dataTransfer.setData("text/plain", id);
 };

 const handleDragOver = (
 event: React.DragEvent<HTMLTableRowElement>,
 targetId: string
 ) => {
 event.preventDefault();

 if (!isAdmin || !draggedId || draggedId === targetId) {
 return;
 }

 const row = event.currentTarget.getBoundingClientRect();
 const position =
 event.clientY < row.top + row.height / 2 ? "before" : "after";

 setDropTarget(current => {
 if (current?.id === targetId && current.position === position) {
 return current;
 }

 return { id: targetId, position };
 });

 event.dataTransfer.dropEffect = "move";
 };

 const handleDrop = async (
 event: React.DragEvent<HTMLTableRowElement>,
 targetId: string
 ) => {
 event.preventDefault();

 const sourceId =
 draggedId || event.dataTransfer.getData("text/plain");

 if (!isAdmin || !sourceId || sourceId === targetId) {
 clearDragState();
 return;
 }

 const previousOrder = [...sortedRenewals];
 const draggedRenewal = previousOrder.find(item => item.id === sourceId);

 if (!draggedRenewal) {
 clearDragState();
 return;
 }

 const remainingRenewals = previousOrder.filter(
 item => item.id !== sourceId
 );

 const targetIndex = remainingRenewals.findIndex(
 item => item.id === targetId
 );

 if (targetIndex === -1) {
 clearDragState();
 return;
 }

 const position = dropTarget?.position || "before";
 const insertIndex =
 position === "after" ? targetIndex + 1 : targetIndex;

 remainingRenewals.splice(insertIndex, 0, draggedRenewal);

 const reorderedRenewals = remainingRenewals.map((item, index) => ({
 ...item,
 orderIndex: index + 1
 }));

 setRenewals(reorderedRenewals);
 clearDragState();

 try {
 await updateRenewalOrder(reorderedRenewals);
 toast.success("Order updated successfully");
 } catch (error) {
 setRenewals(previousOrder);
 console.error("Failed to update renewal order:", error);
 toast.error("Failed to update order");
 }
 };

 return (
 <div className="space-y-8">
 {/* Module Header */}
 <div className="flex flex-col gap-1">
 <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
 Renewal Tracker
 </h1>
 <p className="text-sm text-slate-500 dark:text-slate-400">
 Monitor service costs, expiry dates and renewal status.
 </p>
 </div>

 {/* Header with Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
 <div className="enterprise-card p-5 sm:p-6">
 <div className="flex items-center justify-between mb-4">
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
 Upcoming cost
 </span>
 <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
 </div>
 <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
 {(totalUpcomingCost || 0).toLocaleString()}
 <span className="ml-2 text-sm font-medium text-slate-400">MMK</span>
 </div>
 <p className="mt-1 text-xs text-slate-400">Next 30 days</p>
 </div>

 <div className="enterprise-card p-5 sm:p-6">
 <div className="flex items-center justify-between mb-4">
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
 Action needed
 </span>
 <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
 </div>
 <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
 {upcomingRenewals.length}
 </div>
 <p className="mt-1 text-xs text-slate-400">Items requiring attention</p>
 </div>

 <div className="enterprise-card p-5 sm:p-6 flex items-center justify-between">
 <div>
 <div className="flex items-center gap-2 mb-4">
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
 Active services
 </span>
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
 </div>
 <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
 {renewals.length}
 </div>
 <p className="mt-1 text-xs text-slate-400">Total monitored services</p>
 </div>
 {isAdmin && (
 <button 
 onClick={() => setIsAdding(true)}
 className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white hover:bg-indigo-700 transition-colors"
 title="Add service"
 >
 <Plus size={20} />
 </button>
 )}
 </div>
 </div>

 {/* Renewal Display */}
 <div className="enterprise-card overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left font-sans">
 <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
 <tr className="text-xs text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">Shop / Service</th>
 <th className="px-4 py-3.5">Provider Info</th>
 <th className="px-4 py-3.5">ID</th>
 <th className="px-4 py-3.5">Expire Date</th>
 <th className="px-4 py-3.5">Cost</th>
 <th className="px-4 py-3.5 text-center">Status</th>
 <th className="px-4 py-3.5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
 {renewals.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-6 py-12 text-center">
 <div className="flex flex-col items-center gap-3 text-slate-300">
 <RefreshCw size={32} className="animate-spin-slow" />
 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Initialising Service Tracker...</p>
 </div>
 </td>
 </tr>
 ) : sortedRenewals.map((r, index) => {
 const status = getStatus(r.expireDate);
 return (
 <tr
 key={r.id}
 onDragOver={event => handleDragOver(event, r.id)}
 onDrop={event => handleDrop(event, r.id)}
 className={cn(
 "relative hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group",
 draggedId === r.id && "opacity-40 bg-indigo-50",
 dropTarget?.id === r.id &&
 dropTarget.position === "before" &&
 "border-t-4 border-t-indigo-500",
 dropTarget?.id === r.id &&
 dropTarget.position === "after" &&
 "border-b-4 border-b-indigo-500"
 )}
 >
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-3">
 {isAdmin && (
 <button
 type="button"
 draggable
 onDragStart={event => handleDragStart(event, r.id)}
 onDragEnd={clearDragState}
 className="shrink-0 cursor-grab active:cursor-grabbing p-1.5 -ml-2 text-slate-300 dark:text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors"
 title="Drag to reorder"
 >
 <GripVertical size={18} />
 </button>
 )}
 <div className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center border",
 status === "Expiring Soon" ? "bg-amber-50 border-amber-200 text-amber-500" :
 status === "Expired" ? "bg-rose-50 border-rose-200 text-rose-500" :
 "bg-indigo-50 border-indigo-200 text-indigo-600"
 )}>
 <RefreshCw size={18} className={status === "Expiring Soon" ? "animate-spin-slow" : ""} />
 </div>
 <div>
 <p className="text-sm font-medium text-slate-900 dark:text-white">{r.shopName}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.serviceName}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3.5">
 <div className="space-y-1">
 <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{r.provider || r.ispName || "Unknown"}</p>
 <p className="text-xs text-slate-400">{r.billingCycle}</p>
 </div>
 </td>
 <td className="px-4 py-3.5">
 {r.wifiId ? (
 <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
 {r.wifiId}
 </span>
 ) : (
 <span className="text-xs text-slate-400 font-mono italic">-</span>
 )}
 </td>
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-1.5">
 <Calendar size={12} className={status !== "Active" ? "text-amber-500" : "text-slate-400"} />
 <span className={cn(
 "text-xs font-medium font-mono",
 status === "Expiring Soon" ? "text-amber-500" :
 status === "Expired" ? "text-rose-500" : "text-slate-600 dark:text-slate-300"
 )}>
 {r.expireDate}
 </span>
 </div>
 </td>
 <td className="px-4 py-3.5 font-mono font-semibold text-slate-900 dark:text-slate-100 text-sm whitespace-nowrap">
 {(r.price || 0).toLocaleString()} <span className="text-xs text-slate-400 font-sans">{r.currency}</span>
 </td>
 <td className="px-4 py-3.5">
 <span className={cn(
 "text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap",
 getStatusColor(r.expireDate)
 )}>
 {status}
 </span>
 </td>
 <td className="px-4 py-3.5 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button 
 onClick={() => setInfoRenewal(r)}
 className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
 title="How to Renew"
 >
 <Info size={16} />
 </button>
 {isAdmin && (
 <>
 <button 
 onClick={() => startEdit(r)}
 className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
 title="Edit Record"
 >
 <Edit2 size={16} />
 </button>
 <button 
 onClick={() => {
 if (window.confirm(`Are you sure you want to delete the renewal record for ${r.shopName}?`)) {
 handleDelete(r.id);
 }
 }}
 className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
 title="Delete Record"
 >
 <Trash2 size={16} />
 </button>
 </>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* How to Renew Info Popup */}
 <AnimatePresence>
 {infoRenewal && (
 <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
 <motion.div 
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
 >
 <div className={cn(
 "p-8 text-white relative overflow-hidden",
 getStatus(infoRenewal.expireDate) === "Expired" ? "bg-rose-600" :
 getStatus(infoRenewal.expireDate) === "Expiring Soon" ? "bg-amber-500" : "bg-indigo-600"
 )}>
 <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
 <RefreshCw size={120} className="animate-spin-slow" />
 </div>
 <div className="relative z-10">
 <div className="flex justify-between items-start mb-4">
 <div className="px-3 py-1 bg-white dark:bg-slate-900/20 backdrop-blur-md rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 border border-white/20">
 Renewal Instruction
 </div>
 <button onClick={() => setInfoRenewal(null)} className="p-2 hover:bg-white dark:bg-slate-900/10 rounded-full transition-colors">
 <X size={20} />
 </button>
 </div>
 <h3 className="text-2xl font-medium tracking-tight mb-1">{infoRenewal.serviceName}</h3>
 <p className="text-white/80 text-xs font-medium text-slate-500 dark:text-slate-400">{infoRenewal.shopName}</p>
 </div>
 </div>

 <div className="p-8 space-y-6 bg-white dark:bg-slate-900">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
 <CreditCard size={10} /> Renewal Method
 </p>
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100 dark:text-slate-200">{infoRenewal.renewalMethod || "Not specified"}</p>
 </div>
 <div className="space-y-1">
 <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
 <Check size={10} /> Provider / Contact
 </p>
 <div className="space-y-0.5">
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100 dark:text-slate-200">{infoRenewal.provider || infoRenewal.contactPerson || "Staff/Admin"}</p>
 {infoRenewal.contactPhone && (
 <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
 <Phone size={10} /> {infoRenewal.contactPhone}
 </p>
 )}
 </div>
 </div>
 </div>

 <div className="space-y-3">
 <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
 <ClipboardList size={10} /> Required Documents
 </p>
 <div className="flex flex-wrap gap-2">
 {infoRenewal.requiredDocuments && infoRenewal.requiredDocuments.length > 0 ? infoRenewal.requiredDocuments.map((doc, i) => (
 <span key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
 <Check size={12} className="text-emerald-500" /> {doc}
 </span>
 )) : (
 <span className="text-xs text-slate-400 italic">No specific documents required.</span>
 )}
 </div>
 </div>

 {infoRenewal.websiteLink && (
 <div className="pt-2">
 <a 
 href={infoRenewal.websiteLink} 
 target="_blank" 
 rel="noopener noreferrer"
 className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-sm"
 >
 Visit Online Portal <ExternalLink size={14} className="inline ml-1" />
 </a>
 </div>
 )}
 
 <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3">
 <AlertCircle className="text-amber-500 shrink-0" size={18} />
 <div>
 <p className="text-xs font-medium text-amber-800 mb-1">Important Note</p>
 <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-sans">
 {infoRenewal.remarks || "Please perform renewal at least 3 days before expiry to avoid service interruption."}
 </p>
 </div>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Add/Edit Modal */}
 <AnimatePresence>
 {isAdding && (
 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
 <motion.div 
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl p-8 sm:p-10 shadow-2xl relative my-auto border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100"
 >
 <div className="flex justify-between items-center mb-8">
 <div>
 <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">{editingId ? "Update Service Record" : "Add New Service Record"}</h3>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-slate-500 dark:text-slate-400 mt-1">SOP-004 Documentation Sync</p>
 </div>
 <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors"><X size={24} /></button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
 {/* Basic Info */}
 <div className="space-y-6">
 <h4 className="text-xs font-medium text-indigo-600  pb-2 border-b border-indigo-50 dark:border-indigo-950/30">Basic Information</h4>
 
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Shop Name / Branch</label>
 <input 
 type="text" 
 value={newRenewal.shopName || ""}
 onChange={e => setNewRenewal({...newRenewal, shopName: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
 placeholder="e.g. TGI Main Branch"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Service Type</label>
 <input 
 type="text" 
 value={newRenewal.serviceName || ""}
 onChange={e => setNewRenewal({...newRenewal, serviceName: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
 placeholder="e.g. FIBER Internet"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Service Provider / ISP Name</label>
 <input 
 type="text" 
 value={newRenewal.provider || newRenewal.ispName || ""}
 onChange={e => setNewRenewal({...newRenewal, provider: e.target.value, ispName: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
 placeholder="e.g. Welink, Infinite, MBT, Star Net"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">ID / Reference Number</label>
 <input 
 type="text" 
 value={newRenewal.wifiId || ""}
 onChange={e => setNewRenewal({...newRenewal, wifiId: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
 placeholder="e.g. Wi-Fi ID, Account Number"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Expiry Date</label>
 <input 
 type="date" 
 value={newRenewal.expireDate || ""}
 onChange={e => setNewRenewal({...newRenewal, expireDate: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Price (Amount)</label>
 <input 
 type="number" 
 value={newRenewal.price || ""}
 onChange={e => setNewRenewal({...newRenewal, price: Number(e.target.value)})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans font-mono"
 placeholder="0"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Renewal Instructions */}
 <div className="space-y-6">
 <h4 className="text-xs font-medium text-emerald-600  pb-2 border-b border-emerald-50 dark:border-emerald-950/30">Renewal Instructions</h4>
 
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Renewal Method</label>
 <select 
 value={newRenewal.renewalMethod || ""}
 onChange={e => setNewRenewal({...newRenewal, renewalMethod: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans appearance-none"
 >
 <option value="" className="dark:bg-slate-900">Select Method...</option>
 <option value="Online Payment" className="dark:bg-slate-900">Online Payment (KPay/Bank)</option>
 <option value="Bank Transfer" className="dark:bg-slate-900">Bank Transfer (Company A/C)</option>
 <option value="Office Visit" className="dark:bg-slate-900">Office Visit (In-Person)</option>
 <option value="Agent Pickup" className="dark:bg-slate-900">Agent Pickup (Doorstep)</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Billing Cycle</label>
 <select 
 value={newRenewal.billingCycle || "Yearly"}
 onChange={e => setNewRenewal({...newRenewal, billingCycle: e.target.value as any})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans appearance-none"
 >
 <option value="Monthly" className="dark:bg-slate-900">Monthly</option>
 <option value="Quarterly" className="dark:bg-slate-900">Quarterly</option>
 <option value="Yearly" className="dark:bg-slate-900">Yearly</option>
 </select>
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Website Link</label>
 <input 
 type="url" 
 value={newRenewal.websiteLink || ""}
 onChange={e => setNewRenewal({...newRenewal, websiteLink: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans"
 placeholder="https://portal.provider.com"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Contact Person</label>
 <input 
 type="text" 
 value={newRenewal.contactPerson || ""}
 onChange={e => setNewRenewal({...newRenewal, contactPerson: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
 placeholder="Name"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Phone Number</label>
 <input 
 type="text" 
 value={newRenewal.contactPhone || ""}
 onChange={e => setNewRenewal({...newRenewal, contactPhone: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans font-mono"
 placeholder="09..."
 />
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Required Documents</label>
 <div className="flex flex-wrap gap-2">
 {["ID Card", "Original Invoice", "NID Copy", "Payment Proof", "Company Letter"].map(docName => (
 <button 
 key={docName}
 onClick={() => toggleDoc(docName)}
 type="button"
 className={cn(
 "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
 newRenewal.requiredDocuments?.includes(docName) 
 ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
 : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-200"
 )}
 >
 {docName}
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-4">
 <button 
 onClick={() => { setIsAdding(false); setEditingId(null); }}
 className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-2xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
 >
 Discard
 </button>
 <button 
 onClick={handleSave}
 className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm"
 >
 {editingId ? "Update Monitor Record" : "Create Monitor Entry"}
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
}
