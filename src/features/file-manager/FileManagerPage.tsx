import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Folder, File, Trash2, Eye, Download, ShieldCheck, 
  AlertCircle, RefreshCw, Plus, HardDrive, CheckCircle2, 
  ChevronRight, FileText, Image, Film, Music, Archive, Search, MoreVertical, X,
  Layers, Activity, Check, Edit2, PieChart
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { DriveFile } from '../../types';
import { fetchStorageFiles, deleteStorageFile, uploadStorageFile, fetchStorageQuota } from '../../services/storageService';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { formatStorage, formatId, safeFormat } from '../../utils/file';
import { cn } from '../../lib/utils';

export function FileManagerModule({ isAdmin, quota, setQuota }: { isAdmin: boolean, quota: {limit: string, usage: string} | null, setQuota: (q: {limit: string, usage: string} | null) => void }) {
 const [files, setFiles] = useState<DriveFile[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isUploading, setIsUploading] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [newName, setNewName] = useState("");
 const [searchQuery, setSearchQuery] = useState("");
 
 // Navigation State
 const [currentFolderId, setCurrentFolderId] = useState<string>(""); 
 const [navigationStack, setNavigationStack] = useState<{id: string, name: string}[]>([]);

 const [uploadProgress, setUploadProgress] = useState(0);
 const [dragActive, setDragActive] = useState(false);

 const fetchFiles = async (folderId?: string) => {
 setIsLoading(true);
 try {
 // Fetch Files from Google Drive
 const data = await fetchStorageFiles(folderId || currentFolderId);
 setFiles(data as any);
 
 // Also update quota
 const quotaData = await fetchStorageQuota();
 setQuota(quotaData);
 } catch (err) {
 console.error("Fetch failed", err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchFiles(currentFolderId);
 }, [currentFolderId]);

 const handleFolderClick = (folder: DriveFile) => {
 setNavigationStack(prev => [...prev, { id: currentFolderId, name: folder.name.slice(0, 10) + (folder.name.length > 10 ? '...' : '') }]);
 setCurrentFolderId(folder.id);
 };

 const handleBack = () => {
 const newStack = [...navigationStack];
 const previous = newStack.pop();
 if (previous !== undefined) {
 setNavigationStack(newStack);
 setCurrentFolderId(previous.id);
 }
 };

 const processUpload = async (file: File) => {
 setIsUploading(true);
 setUploadProgress(0);
 
 const formData = new FormData();
 formData.append("file", file);
 if (currentFolderId) {
 formData.append("folderId", currentFolderId);
 }

 try {
 // Artificial progress for UI since fetch doesn't support upload progress natively
 const progressInterval = setInterval(() => {
 setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10));
 }, 300);

 const { data: sessionData } = await supabase.auth.getSession();
 const token = sessionData.session?.access_token || "";
 const response = await fetch("/api/drive/upload", {
 method: "POST",
 headers: {
 "Authorization": `Bearer ${token}`
 },
 body: formData,
 });

 clearInterval(progressInterval);

 if (!response.ok) {
 throw new Error(`Upload failed with status ${response.status}`);
 }
 
 setUploadProgress(100);
 setTimeout(() => {
 setIsUploading(false);
 setUploadProgress(0);
 fetchFiles(currentFolderId);
 }, 500);
 } catch (error) {
 console.error("Upload error", error);
 setIsUploading(false);
 }
 };

 const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) processUpload(file);
 };

 const handleDrag = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (e.type === "dragenter" || e.type === "dragover") {
 setDragActive(true);
 } else if (e.type === "dragleave") {
 setDragActive(false);
 }
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setDragActive(false);
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 processUpload(e.dataTransfer.files[0]);
 }
 };

 const handleRename = async (id: string) => {
 // Cloud storage doesn't support rename natively without copy/delete
 alert("Rename is not supported in this version.");
 setEditingId(null);
 };

 const [confirmTarget, setConfirmTarget] = useState<{ id: string, onConfirm: () => void, message: string, title?: string, confirmText?: string } | null>(null);

 const handleDelete = (id: string) => {
 setConfirmTarget({
 id,
 message: "Are you sure you want to delete this file?",
 onConfirm: async () => {
 setConfirmTarget(null);
 try {
 const pathSuffix = currentFolderId ? `/${currentFolderId}` : '';
 await deleteStorageFile(`uploads${pathSuffix}/${id}`);
 fetchFiles();
 } catch (err) {
 console.error("Delete failed", err);
 }
 }
 });
 };

 const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
 const foldersList = filteredFiles.filter(f => f.mimeType === "application/vnd.google-apps.folder");

 return (
 <div className="flex flex-col lg:flex-row gap-8 min-h-[800px]">
 {/* Main Content Area */}
 <div className="flex-1 space-y-8 order-2 lg:order-1">
 
 {/* Header & Search */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
 <div>
 <h1 className="text-3xl font-medium text-slate-800 dark:text-slate-100 tracking-tight">Cloud Files</h1>
 <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your pharmacy documents and assets securely.</p>
 </div>
 
 <div className="flex items-center gap-3">
 <button 
 className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-2xl flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
 >
 <Plus size={18} />
 <span>New Folder</span>
 </button>
 <label className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer transition-all shadow-md">
 {isUploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
 <span>Upload</span>
 <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
 </label>
 </div>
 </div>

 {/* Drag and Drop Zone */}
 <div 
 className={`relative w-full py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50'}`}
 onDragEnter={handleDrag}
 onDragLeave={handleDrag}
 onDragOver={handleDrag}
 onDrop={handleDrop}
 >
 {isUploading ? (
 <div className="flex flex-col items-center w-full max-w-sm px-8">
 <RefreshCw size={32} className="animate-spin text-indigo-500 mb-4" />
 <div className="w-full bg-slate-200 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
 <div className="bg-indigo-600 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
 </div>
 <span className="text-sm font-medium text-slate-600 dark:text-slate-300 ">{uploadProgress}% Uploaded</span>
 <p className="text-xs text-slate-400 mt-1 italic">Please wait while the file is automatically routed to the correct folder...</p>
 </div>
 ) : (
 <>
 <Upload size={40} className={`mb-4 ${dragActive ? 'text-indigo-500' : 'text-slate-300'}`} />
 <p className="text-lg font-medium text-slate-800 dark:text-slate-100">Drag & Drop files here</p>
 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Videos will go to TikTok_Videos, PSDs to Photoshop_Files, Images to Viber_Photos</p>
 </>
 )}
 </div>

 {/* Quick Access Folders Grid */}
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
 <Layers size={16} className="text-indigo-600" />
 Quick Access
 </h3>
 <div className="flex items-center gap-2">
 {navigationStack.length > 0 && (
 <button 
 onClick={handleBack}
 className="px-3 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-medium text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-800"
 >
 Back
 </button>
 )}
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {isLoading ? (
 Array(4).fill(0).map((_, i) => (
 <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 animate-pulse" />
 ))
 ) : foldersList.length > 0 ? (
 foldersList.slice(0, 4).map((folder) => (
 <div 
 key={folder.id}
 onClick={() => handleFolderClick(folder)}
 className="group relative p-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-[2rem] transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
 >
 <div className="flex items-start justify-between">
 <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
 <Folder size={20} fill="currentColor" fillOpacity={0.2} />
 </div>
 <button className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-300 relative z-10">
 <MoreVertical size={16} />
 </button>
 </div>
 <div className="mt-4">
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{folder.name}</p>
 <p className="text-xs text-slate-400  font-medium tracking-widest mt-1">Folder</p>
 </div>
 </div>
 ))
 ) : (
 <div className="col-span-full py-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
 <p className="text-slate-400 text-xs  font-medium tracking-widest italic">No folders found here.</p>
 </div>
 )}
 
 {/* Add New Folder Card Button */}
 <button className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-[2rem] transition-all group">
 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
 <Plus size={20} />
 </div>
 <p className="text-xs font-medium text-slate-400 mt-2 ">Add New Folder</p>
 </button>
 </div>
 </div>

 {/* Search & Results */}
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row items-center gap-4">
 <div className="relative flex-1 w-full">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <input 
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="Search by file name..."
 className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
 />
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <button className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/10">
 <Activity size={18} />
 </button>
 <button onClick={() => fetchFiles()} className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/10 active:scale-95">
 <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
 </button>
 </div>
 </div>

 <div className="enterprise-card overflow-hidden">
 <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
 <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 ">All Files & Folders</h3>
 <div className="flex gap-4">
 <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 ">Sort By</button>
 <button className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 ">Filter</button>
 </div>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50/30 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">File Name</th>
 <th className="px-4 py-3.5">Time Added</th>
 <th className="px-4 py-3.5">Size</th>
 <th className="px-4 py-3.5">Location</th>
 <th className="px-4 py-3.5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {isLoading ? (
 Array(5).fill(0).map((_, i) => (
 <tr key={i} className="animate-pulse">
 <td className="px-4 py-3.5"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
 <td className="px-4 py-3.5"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
 <td className="px-4 py-3.5"><div className="h-4 w-16 bg-slate-100 rounded"></div></td>
 <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
 <td className="px-4 py-3.5"><div className="h-4 w-8 bg-slate-100 ml-auto rounded"></div></td>
 </tr>
 ))
 ) : filteredFiles.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-24 text-center">
 <HardDrive size={48} className="mx-auto text-slate-200 mb-4" />
 <p className="text-slate-500 dark:text-slate-400 font-medium text-slate-500 dark:text-slate-400 text-xs">No entries found.</p>
 </td>
 </tr>
 ) : (
 filteredFiles.map((file) => {
 const isFolder = file.mimeType === "application/vnd.google-apps.folder";
 return (
 <tr key={file.id} className="group hover:bg-slate-50 transition-colors">
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-4">
 <div className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
 isFolder ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
 )}>
 {isFolder ? <Folder size={20} /> : <FileText size={20} />}
 </div>
 <div className="min-w-0">
 {editingId === file.id ? (
 <div className="flex items-center gap-2">
 <input 
 value={newName} 
 onChange={e => setNewName(e.target.value)}
 className="bg-white dark:bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-100"
 autoFocus
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleRename(file.id);
 if (e.key === 'Escape') setEditingId(null);
 }}
 />
 <button onClick={() => handleRename(file.id)} className="text-emerald-600">
 <Check size={16} />
 </button>
 <button onClick={() => setEditingId(null)} className="text-slate-400">
 <X size={16} />
 </button>
 </div>
 ) : (
 <>
 {isFolder ? (
 <button 
 onClick={() => handleFolderClick(file)}
 className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-indigo-600 transition-colors text-left block truncate max-w-[200px]"
 >
 {file.name}
 </button>
 ) : (
 <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{file.name}</p>
 )}
 <p className="text-xs text-slate-400 font-mono mt-1">{formatId(file.id)}</p>
 </>
 )}
 </div>
 </div>
 </td>
 <td className="px-4 py-3.5">
 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 ">{safeFormat(file.createdAt, "MMM d, HH:mm")}</p>
 </td>
 <td className="px-4 py-3.5">
 <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
 {isFolder ? "--" : formatStorage(file.size)}
 </p>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
 <Folder size={12} />
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400">DRIVE</span>
 </div>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 {!isFolder && (
 <a 
 href={file.webContentLink || file.webViewLink} 
 target="_blank" 
 rel="noopener noreferrer"
 className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
 >
 <Download size={16} />
 </a>
 )}
 <button 
 onClick={() => { setEditingId(file.id); setNewName(file.name); }}
 className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
 >
 <Edit2 size={16} />
 </button>
 {isAdmin && (
 <button 
 onClick={() => handleDelete(file.id)}
 className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
 >
 <Trash2 size={16} />
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>

 {/* Sidebar - Storage & Info */}
 <div className="lg:w-80 space-y-6 order-1 lg:order-2">
 {/* Storage Overview Widget */}
 <div className="enterprise-card p-8 relative overflow-hidden group">
 <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
 <PieChart size={16} className="text-indigo-600" />
 File Breakdown
 </h3>
 
 {/* Mock Chart Visualization */}
 <div className="relative w-48 h-48 mx-auto mb-8">
 {quota ? (() => {
 const usage = Number(quota.usage) || 0;
 const limit = Number(quota.limit) || 2199023255552;
 const percent = Math.min(1, usage / limit);
 const offset = 502 * (1 - percent);
 
 return (
 <>
 <svg className="w-full h-full transform -rotate-90">
 <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100" />
 <circle 
 cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" 
 strokeDasharray="502" 
 strokeDashoffset={isNaN(offset) ? 502 : offset} 
 className={cn(
 percent > 0.9 ? "text-rose-500" : "text-indigo-600"
 )} 
 />
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <p className="text-3xl font-medium text-slate-800 dark:text-slate-100 tracking-tighter">
 {(percent * 100).toFixed(1)}%
 </p>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mt-1">Full</p>
 </div>
 </>
 );
 })() : (
 <div className="flex items-center justify-center h-full">
 <RefreshCw className="animate-spin text-slate-200" size={32} />
 </div>
 )}
 </div>

 <div className="space-y-4">
 {(() => {
 const totalFiles = files.length;
 const images = files.filter(f => f.mimeType?.startsWith('image/')).length;
 const docs = files.filter(f => f.mimeType?.includes('pdf') || f.mimeType?.includes('sheet') || f.mimeType?.includes('word')).length;
 const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder').length;
 const others = totalFiles - images - docs - folders;

 return [
 { label: "Folders", count: folders, color: "bg-amber-500" },
 { label: "Document Assets", count: docs, color: "bg-emerald-500" },
 { label: "Media Assets", count: images, color: "bg-indigo-500" },
 { label: "System Data", count: others, color: "bg-slate-400" },
 ].map((item, idx) => (
 <div key={idx} className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={cn("w-2 h-2 rounded-full", item.color)}></div>
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ">{item.label}</span>
 </div>
 <span className="text-xs font-mono text-slate-400">{item.count.toLocaleString()}</span>
 </div>
 ));
 })()}
 </div>
 
 {/* Storage Alert */}
 <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-[2rem] relative">
 <div className="absolute top-0 right-0 p-4 opacity-10">
 <AlertCircle size={48} className="text-indigo-500" />
 </div>
 <h4 className="text-xs font-medium text-slate-800 dark:text-slate-100 mb-2">Storage Status</h4>
 {quota ? (() => {
 const usage = Number(quota.usage) || 0;
 const limit = Number(quota.limit) || 2199023255552;
 const percent = Math.min(1, usage / limit);
 return (
 <>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mb-4">
 {formatStorage(usage)} / {formatStorage(limit)}
 </p>
 <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
 <div 
 className={cn(
 "h-full transition-all duration-500",
 percent > 0.9 ? "bg-rose-500" : "bg-indigo-600"
 )} 
 style={{ width: `${percent * 100}%` }} 
 />
 </div>
 </>
 );
 })() : (
 <div className="h-1.5 w-full bg-slate-100 rounded-full animate-pulse" />
 )}
 </div>
 </div>

 {/* Connection Info */}
 <div className="enterprise-card p-8">
 <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-4">Security</h3>
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
 <ShieldCheck size={20} />
 </div>
 <div>
 <p className="text-xs font-medium text-slate-800 dark:text-slate-100 ">Encrypted</p>
 <p className="text-xs text-emerald-600 font-medium text-slate-500 dark:text-slate-400">TLS 1.3 Active</p>
 </div>
 </div>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">All files are synced with Taunggyi Pharmacy G-Suite Node.</p>
 <button className="w-full py-4 bg-white dark:bg-slate-900/5 hover:bg-white dark:bg-slate-900/10 text-white text-xs font-medium  rounded-2xl border border-white/5 transition-all">
 System Logs
 </button>
 </div>
 </div>

 <ConfirmationModal 
 isOpen={confirmTarget !== null}
 onClose={() => setConfirmTarget(null)}
 onConfirm={() => {
 if (confirmTarget) confirmTarget.onConfirm();
 }}
 title={confirmTarget?.title || "Confirm Action"}
 message={confirmTarget?.message}
 confirmText={confirmTarget?.confirmText || "Delete Permanently"}
 />
 </div>
 );
}
