import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Building2, MapPin, Phone, ShieldCheck, 
  Trash2, Plus, Edit3, CheckCircle2, AlertCircle, RefreshCw, 
  Layers, Lock, Database, ArrowUpDown, ChevronRight, X, Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SystemSettings, ITAsset, UserRole, PasswordVaultEntry } from '../../types';
import { saveSettings } from '../../services/settingsService';
import { saveActivity } from '../../services/kpiService';
import { clearAllAssets, migrateAssetsToSequentialCodes } from '../../services/assetService';
import { getPasswordEntries, savePasswordEntry, deletePasswordEntry } from '../../services/securityService';
import { useAccessControl } from '../../contexts/AccessControlContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { ResetAssetsButton } from '../../components/ResetAssetsButton';
import { UserManagement } from '../../components/UserManagement';
import { cn } from '../../lib/utils';

export function SettingsModule({ settings, setSettings, isAdmin, allNavItems, setAssets }: { settings: SystemSettings, setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>, isAdmin: boolean, allNavItems: any[], setAssets: React.Dispatch<React.SetStateAction<ITAsset[]>> }) {
 const [confirmTarget, setConfirmTarget] = useState<{ id: string, onConfirm: () => void, message: string, title?: string, confirmText?: string } | null>(null);
 const [newDept, setNewDept] = useState("");
 const [newLoc, setNewLoc] = useState("");
 const [newBranchName, setNewBranchName] = useState("");
 const [newBranchLoc, setNewBranchLoc] = useState("");
 const [newBranchPhone, setNewBranchPhone] = useState("");
 const [newPassLabel, setNewPassLabel] = useState("");
 const [newPassAccount, setNewPassAccount] = useState("");
 const [newPassVal, setNewPassVal] = useState("");
 const [passwordEntries, setPasswordEntries] = useState<PasswordVaultEntry[]>([]);
 const [editingPasswordNote, setEditingPasswordNote] = useState<any | null>(null);
 const [editingBranchNote, setEditingBranchNote] = useState<any | null>(null);
 const { permissions, updatePermission } = useAccessControl();

 useEffect(() => {
 if (isAdmin) {
 const loadAndMigratePasswords = async () => {
 try {
 const legacyNotes = (settings as any).passwordNotes;
 if (legacyNotes && legacyNotes.length > 0) {
 console.log("Found legacy passwordNotes in settings config. Initiating one-time database migration to password_vault...");
 for (const note of legacyNotes) {
 const entry: PasswordVaultEntry = {
 id: note.id || Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5),
 label: note.label || "",
 account: note.account || "",
 password: note.password || ""
 };
 await savePasswordEntry(entry);
 }
 const { passwordNotes, ...strippedSettings } = settings as any;
 setSettings(strippedSettings);
 await saveSettings(strippedSettings);
 console.log("Legacy passwordNotes successfully migrated to password_vault and removed from system_config.");
 }

 const entries = await getPasswordEntries();
 setPasswordEntries(entries);
 } catch (error) {
 console.error("Failed to load or migrate database password entries:", error);
 }
 };
 loadAndMigratePasswords();
 }
 }, [isAdmin, settings, setSettings]);

 const addDept = () => {
 if (!isAdmin || !newDept.trim()) return;
 const newSettings = { ...settings, departments: [...settings.departments, newDept.trim()] };
 setSettings(newSettings);
 saveSettings(newSettings);
 setNewDept("");
 };

 const addLoc = () => {
 if (!isAdmin || !newLoc.trim()) return;
 const newSettings = { ...settings, locations: [...settings.locations, newLoc.trim()] };
 setSettings(newSettings);
 saveSettings(newSettings);
 setNewLoc("");
 };

 const addBranchNote = () => {
 if (!isAdmin || !newBranchName.trim() || !newBranchLoc.trim() || !newBranchPhone.trim()) return;
 const newNote = {
 id: Date.now().toString(),
 name: newBranchName.trim(),
 location: newBranchLoc.trim(),
 phone: newBranchPhone.trim()
 };
 const newSettings = { 
 ...settings, 
 branchNotes: [...(settings.branchNotes || []), newNote] 
 };
 setSettings(newSettings);
 saveSettings(newSettings);
 setNewBranchName("");
 setNewBranchLoc("");
 setNewBranchPhone("");
 };
 
 const addPasswordNote = async () => {
 if (!isAdmin || !newPassLabel.trim() || !newPassAccount.trim() || !newPassVal.trim()) return;
 const newNote: PasswordVaultEntry = {
 id: Date.now().toString(),
 label: newPassLabel.trim(),
 account: newPassAccount.trim(),
 password: newPassVal.trim()
 };
 await savePasswordEntry(newNote);
 setPasswordEntries(prev => [...prev, newNote]);
 setNewPassLabel("");
 setNewPassAccount("");
 setNewPassVal("");
 };

 const togglePermission = async (role: string, itemId: string) => {
 if (!isAdmin) return;
 const currentPerm = permissions.find(p => p.role === role);
 const isAllowed = currentPerm?.allowed_menus[itemId] === true;
 await updatePermission(role, itemId, !isAllowed);
 };

 return (
 <div className="space-y-8 pb-20 lg:pb-0">
 <div className="enterprise-card p-6 lg:p-10">
 <h2 className="text-xl lg:text-2xl font-medium text-slate-800 dark:text-slate-100 tracking-tight ">System Configuration</h2>
 <p className="text-xs lg:text-xs text-slate-400 mt-2 lg:mt-3 leading-relaxed font-medium">
 {isAdmin ? "Manage Organizational Structures & Menu Access Control" : "View-Only: Organizational Structures & Menu Access Control"}
 </p>
 </div>

 <div className="grid grid-cols-1 gap-8">
 {/* Menu Permissions Section */}
 <div className="enterprise-card p-6">
 <h3 className="font-medium text-slate-800 dark:text-slate-100  mb-6">Menu Access Control</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr>
 <th className="text-left py-2">Role</th>
 {allNavItems.map(item => <th key={item.id} className="text-center py-2 px-2 text-xs ">{item.label}</th>)}
 </tr>
 </thead>
 <tbody>
 {Object.values(UserRole).map(role => (
 <tr key={role} className="border-t border-slate-100">
 <td className="py-2 font-medium">{role}</td>
 {allNavItems.map(item => (
 <td key={item.id} className="text-center py-2 px-2">
 <input 
 type="checkbox"
 checked={permissions.find(p => p.role === role)?.allowed_menus[item.id] || false}
 onChange={() => togglePermission(role, item.id)}
 disabled={!isAdmin}
 />
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* User Management Section */}
 <div className="enterprise-card p-6">
 <UserManagement isSuperAdmin={isAdmin} />
 </div>

 {/* Password Notes Section */}
 <div className="enterprise-card p-6">
 <h3 className="font-medium text-slate-800 dark:text-slate-100  mb-6">Account Credentials</h3>
 {isAdmin ? (
 <>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
 <input type="text" value={newPassLabel} onChange={e => setNewPassLabel(e.target.value)} placeholder="Label (e.g. Gmail)..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <input type="text" value={newPassAccount} onChange={e => setNewPassAccount(e.target.value)} placeholder="Account..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <input type="text" value={newPassVal} onChange={e => setNewPassVal(e.target.value)} placeholder="Password..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <button onClick={addPasswordNote} className="px-6 py-3 bg-amber-600 text-white rounded-xl font-medium text-xs hover:bg-amber-500 transition-colors shadow-lg">Save</button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {passwordEntries.map(note => (
 editingPasswordNote?.id === note.id ? (
 <div key={note.id} className="p-4 bg-amber-50 border border-amber-200 rounded-xl relative">
 <input type="text" value={editingPasswordNote.label} onChange={e => setEditingPasswordNote({...editingPasswordNote, label: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Label" />
 <input type="text" value={editingPasswordNote.account} onChange={e => setEditingPasswordNote({...editingPasswordNote, account: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Account" />
 <input type="text" value={editingPasswordNote.password} onChange={e => setEditingPasswordNote({...editingPasswordNote, password: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Password" />
 <button onClick={async () => {
 await savePasswordEntry(editingPasswordNote);
 setPasswordEntries(prev => prev.map(n => n.id === note.id ? editingPasswordNote : n));
 setEditingPasswordNote(null);
 }} className="mt-2 w-full bg-amber-600 text-white p-2 rounded text-xs font-medium">Save</button>
 </div>
 ) : (
 <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl relative group">
 <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{note.label}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Acc: {note.account}</p>
 <p className="text-xs text-amber-600 mt-1 font-mono">Pass: {note.password}</p>
 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2">
 <button onClick={() => setEditingPasswordNote(note)} className="text-slate-400 hover:text-indigo-500 text-xs">Edit</button>
 <button onClick={async () => {
 await deletePasswordEntry(note.id);
 setPasswordEntries(prev => prev.filter(n => n.id !== note.id));
 }} className="text-slate-400 hover:text-red-500 text-xs">Delete</button>
 </div>
 </div>
 )
 ))}
 </div>
 </>
 ) : (
 <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center gap-2">
 <span className="font-medium">Access Restricted:</span> Only IT Supervisors and Administrators can view account credentials.
 </div>
 )}
 </div>

 {/* Branch Notes Section */}
 <div className="enterprise-card p-6">
 <h3 className="font-medium text-slate-800 dark:text-slate-100  mb-6">Branch Locations & Contacts</h3>
 {isAdmin && (
 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
 <input type="text" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} placeholder="Branch Name..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <input type="text" value={newBranchLoc} onChange={e => setNewBranchLoc(e.target.value)} placeholder="Location..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <input type="text" value={newBranchPhone} onChange={e => setNewBranchPhone(e.target.value)} placeholder="Phone..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <button onClick={addBranchNote} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-xs hover:bg-blue-500 transition-colors shadow-lg">Add Note</button>
 </div>
 )}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {(settings.branchNotes || []).map(note => (
 editingBranchNote?.id === note.id ? (
 <div key={note.id} className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl relative">
 <input type="text" value={editingBranchNote.name} onChange={e => setEditingBranchNote({...editingBranchNote, name: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Branch Name" />
 <input type="text" value={editingBranchNote.location} onChange={e => setEditingBranchNote({...editingBranchNote, location: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Location" />
 <input type="text" value={editingBranchNote.phone} onChange={e => setEditingBranchNote({...editingBranchNote, phone: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Phone" />
 <button onClick={() => {
 setSettings(p => ({...p, branchNotes: p.branchNotes?.map(n => n.id === note.id ? editingBranchNote : n)}));
 setEditingBranchNote(null);
 }} className="mt-2 w-full bg-indigo-600 text-white p-2 rounded text-xs font-medium">Save</button>
 </div>
 ) : (
 <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl relative group">
 <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{note.name}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{note.location}</p>
 <p className="text-xs text-indigo-600 mt-1 font-mono">{note.phone}</p>
 {isAdmin && (
 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2">
 <button onClick={() => setEditingBranchNote(note)} className="text-slate-400 hover:text-indigo-500 text-xs">Edit</button>
 <button onClick={() => setSettings(p => ({...p, branchNotes: p.branchNotes?.filter(n => n.id !== note.id)}))} className="text-slate-400 hover:text-red-500 text-xs">Delete</button>
 </div>
 )}
 </div>
 )
 ))}
 </div>
 </div>

 {/* Existing Dept/Loc UI */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <div className="enterprise-card p-6">
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
 <Layers size={20} />
 </div>
 <h3 className="font-medium text-slate-800 dark:text-slate-100 ">Departments</h3>
 </div>
 {isAdmin && (
 <div className="flex gap-2 mb-6">
 <input 
 type="text" 
 value={newDept}
 onChange={e => setNewDept(e.target.value)}
 placeholder="New department name..."
 className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
 />
 <button 
 onClick={addDept}
 className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-100"
 >
 Add
 </button>
 </div>
 )}
 <div className="flex flex-wrap gap-2">
 {settings.departments.map(d => (
 <span key={d} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 ">
 {d}
 </span>
 ))}
 </div>
 </div>

 <div className="enterprise-card p-6">
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
 <Globe size={20} />
 </div>
 <h3 className="font-medium text-slate-800 dark:text-slate-100 ">Locations</h3>
 </div>
 {isAdmin && (
 <div className="flex gap-2 mb-6">
 <input 
 type="text" 
 value={newLoc}
 onChange={e => setNewLoc(e.target.value)}
 placeholder="New location name..."
 className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
 />
 <button 
 onClick={addLoc}
 className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium text-xs hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-100"
 >
 Add
 </button>
 </div>
 )}
 <div className="flex flex-wrap gap-2">
 {settings.locations.map(l => (
 <span key={l} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 ">
 {l}
 </span>
 ))}
 </div>
 </div>
 </div>

 </div>

 <ConfirmationModal 
 isOpen={confirmTarget !== null}
 onClose={() => setConfirmTarget(null)}
 onConfirm={() => {
 if (confirmTarget) confirmTarget.onConfirm();
 }}
 title={confirmTarget?.title || "Admin Protocol Confirmation"}
 message={confirmTarget?.message}
 confirmText={confirmTarget?.confirmText || "Confirm Execution"}
 />
 </div>
 );
}
