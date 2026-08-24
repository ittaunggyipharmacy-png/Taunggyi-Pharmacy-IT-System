import React, { useState, useEffect } from "react";
import { Users, Shield, ShieldCheck, ShieldAlert, UserCog, Mail, Clock, Pencil, Check, X } from "lucide-react";
import { SystemUser, UserRole } from "../../types";
import { getAllSystemUsers, updateSystemUserRole, updateSystemUserDisplayName } from "../../services/userService";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";

const ROLE_CONFIG = {
 [UserRole.ADMIN]: { icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50", label: "System Admin" },
 [UserRole.IT_SUPERVISOR]: { icon: Shield, color: "text-indigo-600", bg: "bg-indigo-50", label: "IT Supervisor" },
 [UserRole.MERCHANDISING_SUPERVISOR]: { icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50", label: "Merch Supervisor" },
 [UserRole.IT_DIGITAL_MARKETING]: { icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50", label: "IT Digital Mkt" },
 [UserRole.STAFF]: { icon: Users, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-50", label: "Staff" },
};

export const UserManagement = ({ isSuperAdmin }: { isSuperAdmin: boolean }) => {
 const [users, setUsers] = useState<SystemUser[]>([]);
 const [loading, setLoading] = useState(true);
 const [updating, setUpdating] = useState<string | null>(null);
 const [editingName, setEditingName] = useState<string | null>(null);
 const [nameDraft, setNameDraft] = useState("");

 useEffect(() => { fetchUsers(); }, []);

 const fetchUsers = async () => {
  setLoading(true);
  try { setUsers(await getAllSystemUsers()); }
  catch (error) { console.error("Failed to fetch users", error); toast.error("Users load မအောင်မြင်ပါ။"); }
  finally { setLoading(false); }
 };

 const handleRoleChange = async (uid: string, newRole: UserRole) => {
  if (!isSuperAdmin) return;
  setUpdating(uid);
  try {
   await updateSystemUserRole(uid, newRole);
   setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
   toast.success("Role updated");
  } catch (error) { console.error(error); toast.error("Role update မအောင်မြင်ပါ။"); }
  finally { setUpdating(null); }
 };

 const startNameEdit = (user: SystemUser) => {
  if (!isSuperAdmin) return;
  setEditingName(user.uid);
  setNameDraft(user.displayName || "");
 };

 const cancelNameEdit = () => { setEditingName(null); setNameDraft(""); };

 const saveName = async (uid: string) => {
  if (!isSuperAdmin) return;
  const name = nameDraft.trim();
  if (!name) { toast.error("User name ဖြည့်ပေးပါ။"); return; }
  setUpdating(uid);
  try {
   await updateSystemUserDisplayName(uid, name);
   setUsers(prev => prev.map(u => u.uid === uid ? { ...u, displayName: name } : u));
   cancelNameEdit();
   toast.success("User name updated");
  } catch (error: any) { console.error(error); toast.error(error?.message || "User name update မအောင်မြင်ပါ။"); }
  finally { setUpdating(null); }
 };

 if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

 return (
  <div className="space-y-6">
   <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
    <div><h2 className="text-2xl font-medium text-slate-800 dark:text-slate-100 tracking-tight">Personnel Access Control</h2><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Assign roles and manage authorized staff. User names can be edited by Super Admin.</p></div>
    <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-700 text-xs font-medium border border-indigo-100"><Shield size={14} /> Security Protocol Active</div>
   </header>

   <div className="grid grid-cols-1 gap-4">
    {users.map((user) => {
     const config = ROLE_CONFIG[user.role] || ROLE_CONFIG[UserRole.STAFF];
     const Icon = config.icon;
     const isEditing = editingName === user.uid;
     const isUpdating = updating === user.uid;

     return (
      <motion.div layout key={user.uid} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-6 shadow-sm hover:shadow-md transition-shadow">
       <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative shrink-0">
         {user.photoURL ? <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm" /> : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-medium">{user.displayName?.charAt(0) || "U"}</div>}
         <div className={`absolute -bottom-1 -right-1 p-1 rounded-lg ${config.bg} ${config.color} border border-white shadow-sm`}><Icon size={12} /></div>
        </div>
        <div className="min-w-0 flex-1">
         {isEditing ? (
          <div className="flex items-center gap-2 max-w-lg">
           <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveName(user.uid); if (e.key === 'Escape') cancelNameEdit(); }} className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="User name" disabled={isUpdating} />
           <button type="button" onClick={() => saveName(user.uid)} disabled={isUpdating} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50" title="Save name"><Check size={16} /></button>
           <button type="button" onClick={cancelNameEdit} disabled={isUpdating} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50" title="Cancel"><X size={16} /></button>
          </div>
         ) : (
          <div className="flex items-center gap-2 min-w-0">
           <h3 className="font-medium text-slate-900 dark:text-white truncate flex items-center gap-2">{user.displayName}{user.role === UserRole.ADMIN && <ShieldCheck size={14} className="text-rose-500 shrink-0" />}</h3>
           {isSuperAdmin && <button type="button" onClick={() => startNameEdit(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title="Edit user name"><Pencil size={14} /></button>}
          </div>
         )}
         <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-xs text-slate-400 font-medium"><Mail size={10} /> {user.email}</span>
          <span className="hidden md:inline w-1 h-1 bg-slate-200 rounded-full" />
          <span className="flex items-center gap-1 text-xs text-slate-400 font-medium lowercase"><Clock size={10} /> Joined {(() => { const createdAt = user.createdAt as any; if (!createdAt) return "Unknown"; if (typeof createdAt.seconds === 'number') return new Date(createdAt.seconds * 1000).toLocaleDateString(); const d = new Date(createdAt); return isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString(); })()}</span>
         </div>
        </div>
       </div>

       <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1 w-full md:w-auto"><label className="text-xs font-medium text-slate-400 ml-1">Access Level</label><select disabled={isUpdating || !isSuperAdmin || isEditing} value={user.role} onChange={e => handleRoleChange(user.uid, e.target.value as UserRole)} className={`px-4 py-2.5 rounded-xl text-xs font-medium outline-none border transition-all appearance-none cursor-pointer bg-slate-50 ${isUpdating || !isSuperAdmin || isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-300 focus:ring-4 focus:ring-indigo-50 border-slate-200 dark:border-slate-800'}`}>
         {Object.entries(UserRole).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
        </select></div>
       </div>

       <div className="hidden lg:flex flex-col items-end gap-1"><span className="text-xs font-medium text-slate-400">Status</span><div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium border border-emerald-100"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> AUTHORIZED</div></div>
      </motion.div>
     );
    })}
    {users.length === 0 && <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl"><UserCog size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-sm font-medium text-slate-400">No system users found</p></div>}
   </div>
  </div>
 );
};
