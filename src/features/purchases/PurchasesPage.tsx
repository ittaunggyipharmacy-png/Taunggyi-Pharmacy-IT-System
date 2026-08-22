import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Plus, Search, Trash2, Edit3, CheckCircle2, 
  AlertCircle, RefreshCw, Calendar, Tag, Layers, 
  ExternalLink, UserCheck, ShieldCheck, Check, Clock, Laptop, 
  ArrowUpDown, Filter, ChevronRight, X, AlertTriangle, FileSpreadsheet, Download,
  History, Ban
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { utils, writeFile } from 'xlsx';
import { toast } from 'react-hot-toast';
import { PurchaseRecord, ITAsset } from '../../types';
import { savePurchaseRecord, deletePurchaseRecord } from '../../services/purchaseService';
import { saveActivity } from '../../services/kpiService';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { cn } from '../../lib/utils';

export function PurchasesModule({ 
 purchases, 
 setPurchases, 
 assets, 
 setAssets,
 isAdmin
}: { 
 purchases: PurchaseRecord[], 
 setPurchases: React.Dispatch<React.SetStateAction<PurchaseRecord[]>>,
 assets: ITAsset[],
 setAssets: React.Dispatch<React.SetStateAction<ITAsset[]>>,
 isAdmin: boolean
}) {
 const [isAdding, setIsAdding] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'purchase' } | null>(null);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [newPurchase, setNewPurchase] = useState<Partial<PurchaseRecord>>({
 status: "Received",
 currency: "MMK",
 quantity: 1,
 syncToInventory: true
 });

 const combinedPurchases = React.useMemo(() => {
 const list = [...purchases];
 
 // Find assets that aren't linked to a purchase record ID
 const unlinkedAssets = assets.filter(a => {
 const isHistorical = a.purchaseDate && a.purchaseDate !== "Unknown" && a.purchaseDate !== "";
 const isNotLinked = !a.purchaseRecordId;
 return isHistorical && isNotLinked;
 });
 
 const groups: Record<string, ITAsset[]> = {};
 unlinkedAssets.forEach(a => {
 const key = `${a.purchaseDate}_${a.model}`;
 if (!groups[key]) groups[key] = [];
 groups[key].push(a);
 });

 Object.values(groups).forEach(group => {
 const first = group[0];
 const exists = purchases.find(p => p.date === first.purchaseDate && p.item === first.model);
 if (!exists) {
 list.push({
 id: `HIST-${first.id}`,
 item: first.model,
 category: first.category,
 price: Number(first.purchasePrice) || 0,
 currency: "MMK",
 quantity: group.length,
 date: first.purchaseDate!,
 supplier: "Legacy Data",
 status: "Received"
 });
 }
 });

 return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
 }, [purchases, assets]);

 const handleAdd = async () => {
 if (!newPurchase.item || !newPurchase.price || !newPurchase.date) return;
 
 const purchaseData: Partial<PurchaseRecord> = {
 id: editingId || undefined,
 item: newPurchase.item,
 category: newPurchase.category || "Other",
 price: Number(newPurchase.price),
 currency: newPurchase.currency || "MMK",
 quantity: Number(newPurchase.quantity) || 1,
 date: newPurchase.date,
 supplier: newPurchase.supplier || "Unknown",
 supplierContact: newPurchase.supplierContact,
 status: newPurchase.status as any,
 remarks: newPurchase.remarks,
 serialNumber: newPurchase.serialNumber,
 syncToInventory: newPurchase.syncToInventory ?? true
 };

 try {
 await savePurchaseRecord(purchaseData);
 setIsAdding(false);
 setIsEditing(false);
 setEditingId(null);
 setNewPurchase({ status: "Received", currency: "MMK", quantity: 1 });
 } catch (error) {
 console.error("Failed to save purchase record", error);
 alert("Failed to save purchase record. Check SOP-001 logs.");
 }
 };

 const handleEdit = (record: PurchaseRecord) => {
 setEditingId(record.id);
 setIsEditing(true);
 setNewPurchase({
 item: record.item,
 category: record.category,
 price: record.price,
 currency: record.currency,
 quantity: record.quantity,
 date: record.date,
 supplier: record.supplier,
 supplierContact: record.supplierContact,
 status: record.status,
 remarks: record.remarks
 });
 setIsAdding(true);
 };

 const totalSpent = combinedPurchases.reduce((sum, p) => sum + (p.price * p.quantity), 0);
 const handleExportPurchases = () => {
 const data = combinedPurchases.map(p => ({
 "Record ID": p.id,
 "Date": p.date,
 "Item": p.item,
 "Category": p.category,
 "Supplier": p.supplier,
 "Quantity": p.quantity,
 "Unit Price": p.price,
 "Total Price": p.price * p.quantity,
 "Currency": p.currency,
 "Status": p.status,
 }));
 
 const ws = utils.json_to_sheet(data);
 const wb = utils.book_new();
 utils.book_append_sheet(wb, ws, "Purchases");
 writeFile(wb, `IT_Purchases_Export_${format(new Date(), 'yyyyMMdd')}.xlsx`);
 };

 const handleDeletePurchase = (recordId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setDeleteTarget({ id: recordId, type: 'purchase' });
 };

 const executeDelete = async () => {
 if (!deleteTarget || deleteTarget.type !== 'purchase') return;
 const recordId = deleteTarget.id;

 const tid = toast.loading("Voiding procurement record...");
 setIsDeleting(true);
 try {
 await deletePurchaseRecord(recordId);
 setPurchases(prev => prev.filter(p => p.id !== recordId));
 toast.success("Procurement record voided.", { id: tid });
 } catch (error) {
 console.error("Delete failed", error);
 toast.error("Protocol Violation: Deletion request rejected.", { id: tid });
 }
 
 setIsDeleting(false);
 setDeleteTarget(null);
 };

 return (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="enterprise-card p-6 border-l-4 border-indigo-500">
 <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-sans">Total Procurement</div>
 <div className="text-2xl font-medium text-slate-900 dark:text-white font-mono">{totalSpent.toLocaleString()} <span className="text-xs text-indigo-600">MMK</span></div>
 </div>
 <div className="enterprise-card p-6 border-l-4 border-amber-500">
 <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-sans">Transits</div>
 <div className="text-2xl font-medium text-slate-900 dark:text-white font-mono">{combinedPurchases.filter(p => p.status === "Transit").length} <span className="text-xs text-amber-400  font-sans">Items</span></div>
 </div>
 <div className="enterprise-card p-6 border-l-4 border-emerald-500 flex items-center justify-between font-sans">
 <div>
 <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total Records</div>
 <div className="text-2xl font-medium text-slate-900 dark:text-white font-mono">{combinedPurchases.length}</div>
 </div>
 <div className="flex items-center gap-2">
 <button 
 onClick={handleExportPurchases}
 className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all text-emerald-600 border border-emerald-200"
 title="Export Purchases"
 >
 <Download size={16} />
 </button>
 {isAdmin && (
 <button 
 onClick={() => setIsAdding(true)}
 className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all text-white shadow-sm"
 >
 <Plus size={20} />
 </button>
 )}
 </div>
 </div>
 </div>

 <div className="enterprise-card overflow-hidden">
 {/* Desktop Table View */}
 <div className="hidden lg:block overflow-x-auto">
 <table className="w-full text-left font-sans">
 <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
 <tr className=" text-[#475569] dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">RECORD DATE</th>
 <th className="px-4 py-3.5">ITEM NAME</th>
 <th className="px-4 py-3.5">QTY</th>
 <th className="px-4 py-3.5">PRICE</th>
 <th className="px-4 py-3.5">STATUS (INVENTORY)</th>
 <th className="px-4 py-3.5">VENDOR INFO</th>
 <th className="px-4 py-3.5 text-right">LOCATION</th>
 {isAdmin && <th className="px-4 py-3.5 text-center">ACTIONS</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {combinedPurchases.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-6 py-12 text-center">
 <div className="flex flex-col items-center gap-3">
 <AlertTriangle className="text-amber-500" size={32} />
 <p className="text-sm text-slate-400">No Purchase Records found.</p>
 <p className="text-xs text-amber-500 font-medium text-slate-500 dark:text-slate-400 leading-loose text-center px-4">
 SOP-001 Protocol: Please upload the latest Data Export (CSV/JSON)<br/>
 or Sync data with Supabase. (ဒေတာများစုစည်းနေဆဲဖြစ်ပါသည်။)
 </p>
 </div>
 </td>
 </tr>
 ) : combinedPurchases.map(p => {
 const linkedAssets = assets.filter(a => a.purchaseRecordId === p.id || (a.purchaseDate === p.date && a.model === p.item));
 const currentStatuses = Array.from(new Set(linkedAssets.map(a => a.status)));
 const locations = Array.from(new Set(linkedAssets.map(a => a.location || a.department).filter(Boolean)));

 return (
 <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
 <td className="px-4 py-3.5">
 <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">{p.date}</span>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 capitalize">
 {p.item.charAt(0)}
 </div>
 <div>
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.item}</p>
 <p className="text-xs text-slate-400 font-mono tracking-tighter ">{p.id}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3.5">
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{p.quantity}</span>
 </td>
 <td className="px-4 py-3.5">
 <span className="text-sm font-medium text-emerald-600 font-mono">{(p.price * p.quantity).toLocaleString()} {p.currency}</span>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex flex-wrap gap-1">
 {currentStatuses.length > 0 ? currentStatuses.map(s => (
 <span key={s} className={cn(
 "text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded border",
 s === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200 dark:border-slate-800"
 )}>{s}</span>
 )) : (
 <span className="text-xs font-medium text-slate-300 italic">Syncing...</span>
 )}
 </div>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex flex-col">
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{p.supplier}</span>
 <span className="text-xs text-slate-400 font-mono tracking-tighter">{p.supplierContact || "No Contact"}</span>
 </div>
 </td>
 <td className="px-4 py-3.5 text-right">
 <div className="flex flex-col items-end">
 {locations.length > 0 ? locations.map(l => (
 <span key={l} className="text-xs font-medium text-slate-400 ">{l}</span>
 )) : (
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">Unknown</span>
 )}
 </div>
 </td>
 {isAdmin && (
 <td className="px-4 py-3.5 text-center">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => handleEdit(p)}
 className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
 title="Edit Record"
 >
 <History size={14} />
 </button>
 <button 
 disabled={isDeleting || p.id.startsWith('HIST-')}
 onClick={(e) => handleDeletePurchase(p.id, e)}
 className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30"
 title={p.id.startsWith('HIST-') ? "Cannot delete legacy data generated from assets" : "Delete Record"}
 >
 <Trash2 size={14} />
 </button>
 </div>
 </td>
 )}
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Mobile Card View */}
 <div className="lg:hidden divide-y divide-white/5">
 {combinedPurchases.length === 0 ? (
 <div className="px-6 py-12 text-center">
 <p className="text-xs text-slate-500 dark:text-slate-400">No Purchase Records found.</p>
 </div>
 ) : combinedPurchases.map(p => {
 const linkedAssets = assets.filter(a => a.purchaseRecordId === p.id || (a.purchaseDate === p.date && a.model === p.item));
 const currentStatuses = Array.from(new Set(linkedAssets.map(a => a.status)));
 return (
 <div key={p.id} className="p-4 hover:bg-white dark:bg-slate-900/5 active:bg-white dark:bg-slate-900/10 transition-colors flex flex-col gap-3">
 <div className="flex justify-between items-start">
 <div className="flex flex-col gap-2">
 <span className="text-xs font-mono font-medium text-slate-300">{p.date}</span>
 {isAdmin && (
 <div className="flex gap-2">
 <button
 onClick={() => handleEdit(p)}
 className="w-fit p-1 text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors flex items-center gap-2"
 >
 <History size={12} />
 <span className="text-xs font-medium">Edit</span>
 </button>
 <button 
 disabled={isDeleting || p.id.startsWith('HIST-')}
 onClick={(e) => handleDeletePurchase(p.id, e)}
 className="w-fit p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-30 flex items-center gap-2"
 >
 <Trash2 size={12} />
 <span className="text-xs font-medium">Delete</span>
 </button>
 </div>
 )}
 </div>
 <div className="flex flex-wrap gap-1 justify-end">
 {currentStatuses.length > 0 ? currentStatuses.map(s => (
 <span key={s} className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{s}</span>
 )) : (
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 italic border border-white/10 px-1.5 py-0.5 rounded">Syncing...</span>
 )}
 </div>
 </div>
 <div>
 <p className="text-sm font-medium text-white mb-0.5">{p.item}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tighter ">{p.id} • {p.supplier} {p.supplierContact ? `(${p.supplierContact})` : ""}</p>
 </div>
 <div className="flex justify-between items-end pt-1 border-t border-white/5">
 <div className="flex items-center gap-2">
 <span className="text-xs text-slate-500 dark:text-slate-400 font-medium text-slate-500 dark:text-slate-400">Qty: {p.quantity}</span>
 </div>
 <span className="text-sm font-medium text-emerald-400 font-mono">{(p.price * p.quantity).toLocaleString()} {p.currency}</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <AnimatePresence>
 {isAdding && (
 <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 font-sans">
 <motion.div 
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="glass-panel w-full max-w-lg p-8 space-y-6 shadow-2xl border border-white/20"
 >
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium text-white tracking-tight ">{isEditing ? "Update Purchase Entry" : "New Purchase Entry"}</h3>
 <button onClick={() => { setIsAdding(false); setIsEditing(false); setEditingId(null); setNewPurchase({ status: "Received", currency: "MMK", quantity: 1 }); }} className="p-2 hover:bg-white dark:bg-slate-900/10 rounded-lg text-slate-500 dark:text-slate-400"><X size={20} /></button>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="col-span-2">
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Item Name (Model)</label>
 <input 
 type="text" 
 value={newPurchase.item || ""}
 onChange={e => setNewPurchase({...newPurchase, item: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. Logitech Mouse..."
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Serial Number (Primary/Start)</label>
 <input 
 type="text" 
 value={newPurchase.serialNumber || ""}
 onChange={e => setNewPurchase({...newPurchase, serialNumber: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. SN12345..."
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Category</label>
 <input 
 type="text" 
 value={newPurchase.category || ""}
 onChange={e => setNewPurchase({...newPurchase, category: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. Network"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Supplier</label>
 <input 
 type="text" 
 value={newPurchase.supplier || ""}
 onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. KMD"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Supplier Contact</label>
 <input 
 type="text" 
 value={newPurchase.supplierContact || ""}
 onChange={e => setNewPurchase({...newPurchase, supplierContact: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. 09..."
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Qty</label>
 <input 
 type="number" 
 value={newPurchase.quantity || 1}
 onChange={e => setNewPurchase({...newPurchase, quantity: Number(e.target.value)})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 />
 </div>
 <div className="col-span-2">
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Unit Price (MMK)</label>
 <input 
 type="number" 
 value={newPurchase.price || ""}
 onChange={e => setNewPurchase({...newPurchase, price: Number(e.target.value)})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="0"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Purchase Date</label>
 <input 
 type="date" 
 value={newPurchase.date || ""}
 onChange={e => setNewPurchase({...newPurchase, date: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Inventory Sync</label>
 <button 
 onClick={() => setNewPurchase({...newPurchase, syncToInventory: !newPurchase.syncToInventory})}
 className={cn(
 "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-medium text-slate-500 dark:text-slate-400 transition-all",
 newPurchase.syncToInventory 
 ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
 : "bg-slate-50 text-slate-400 border-slate-200 dark:border-slate-800"
 )}
 >
 {newPurchase.syncToInventory ? <CheckCircle2 size={14} /> : <Ban size={14} />}
 {newPurchase.syncToInventory ? "Sync Active" : "Sync Disabled"}
 </button>
 </div>
 </div>
 </div>

 <div className="flex gap-4 pt-4">
 <button 
 onClick={() => { setIsAdding(false); setIsEditing(false); setEditingId(null); setNewPurchase({ status: "Received", currency: "MMK", quantity: 1, syncToInventory: true }); }}
 className="flex-1 py-4 border border-white/10 text-slate-400 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900/5 transition-all"
 >
 Cancel
 </button>
 <button 
 onClick={handleAdd}
 className="flex-[2] py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 shadow-lg shadow-cyan-900/40 transition-all font-sans font-medium"
 >
 {isEditing ? "Update Entry" : "Record Entry"}
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 <ConfirmationModal 
 isOpen={deleteTarget !== null}
 onClose={() => setDeleteTarget(null)}
 onConfirm={executeDelete}
 isLoading={isDeleting}
 title="Ledger Entry Void"
 message={`SOP-001 Procurement Alert: Are you sure you want to void purchase record ${deleteTarget?.id}? Linked inventory assets will remain but the record will be purged from the ledger.`}
 confirmText="Confirm Void"
 />
 </div>
 );
}

