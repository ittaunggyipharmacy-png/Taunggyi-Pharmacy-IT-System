import React, { useState, useEffect } from "react";
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  UserCog, 
  Mail, 
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { SystemUser, UserRole } from "../types";
import { getAllSystemUsers, updateSystemUserRole } from "../services/firestoreService";

const ROLE_CONFIG = {
  [UserRole.SUPER_ADMIN]: { icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50", label: "Super Admin" },
  [UserRole.IT_SUPERVISOR]: { icon: Shield, color: "text-indigo-600", bg: "bg-indigo-50", label: "IT Supervisor" },
  [UserRole.ASSET_EDITOR]: { icon: Shield, color: "text-blue-600", bg: "bg-blue-50", label: "Asset Editor" },
  [UserRole.DOCUMENT_MANAGER]: { icon: Shield, color: "text-amber-600", bg: "bg-amber-50", label: "Document Manager" },
  [UserRole.CONTENT_MANAGER]: { icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50", label: "Content Manager" },
  [UserRole.STAFF_VIEWER]: { icon: Users, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-50", label: "Staff Viewer" },
  [UserRole.DISABLED]: { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", label: "Disabled" },
};

export function UserManagement({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllSystemUsers();
      setUsers(allUsers as unknown as SystemUser[]);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (!isSuperAdmin) return;
    setUpdating(uid);
    try {
      await updateSystemUserRole(uid, newRole);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Failed to update role", error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Personnel Access Control</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Assign roles and manage system permissions for authorized staff.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1.5 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-100 dark:border-indigo-900">
          <Shield size={14} /> Security Protocol Active
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG[UserRole.STAFF_VIEWER];
          const Icon = cfg.icon;
          return (
            <div key={u.uid} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400">
                    {u.displayName?.charAt(0) || u.email?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{u.displayName || "Staff Member"}</h4>
                    <p className="text-2xs text-slate-400 truncate max-w-[140px]">{u.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>

              {isSuperAdmin && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <label className="text-2xs font-semibold text-slate-500">Change Role:</label>
                  <select
                    value={u.role || UserRole.STAFF_VIEWER}
                    disabled={updating === u.uid}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                    className="text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    {Object.values(UserRole).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UserManagement;
