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
  Database,
  RefreshCw
} from "lucide-react";
import { SystemUser, UserRole } from "../types";
import { getAllSystemUsers, updateSystemUserRole, migrateExistingUsersToAdmins } from "../services/firestoreService";
import { motion, AnimatePresence } from "motion/react";

const ROLE_CONFIG = {
  [UserRole.ADMIN]: { icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50", label: "System Admin" },
  [UserRole.IT_SUPERVISOR]: { icon: Shield, color: "text-indigo-600", bg: "bg-indigo-50", label: "IT Supervisor" },
  [UserRole.MERCHANDISING_SUPERVISOR]: { icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50", label: "Merch Supervisor" },
  [UserRole.IT_DIGITAL_MARKETING]: { icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50", label: "IT Digital Mkt" },
  [UserRole.STAFF]: { icon: Users, color: "text-slate-600", bg: "bg-slate-50", label: "Staff" },
};

export const UserManagement = ({ isSuperAdmin }: { isSuperAdmin: boolean }) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<{ running: boolean; message?: string; success?: boolean } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleMigration = async () => {
    if (!isSuperAdmin) return;
    setMigrationStatus({ running: true, message: "Migrating user database records..." });
    const result = await migrateExistingUsersToAdmins();
    if (result.success) {
      setMigrationStatus({ 
        running: false, 
        success: true, 
        message: `Successfully migrated database! Calculated & wrote isAdmin flag for ${result.count} user document(s).` 
      });
      fetchUsers();
    } else {
      setMigrationStatus({ 
        running: false, 
        success: false, 
        message: `Migration failed: ${result.error || "Unknown error occurred"}` 
      });
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllSystemUsers();
      setUsers(allUsers);
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Personnel Access Control</h2>
          <p className="text-sm text-slate-500 font-medium">Assign roles and manage system permissions for authorized staff.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-700 text-xs font-bold uppercase tracking-widest border border-indigo-100">
          <Shield size={14} /> Security Protocol Active
        </div>
      </header>

      {isSuperAdmin && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database size={16} className="text-indigo-600" />
                Database Role Migration Tool
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Calculate and sync the new <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">isAdmin</code> boolean field for all existing personnel accounts.
              </p>
            </div>
            <button
              onClick={handleMigration}
              disabled={migrationStatus?.running}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] ${migrationStatus?.running ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {migrationStatus?.running ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Database size={14} />
              )}
              {migrationStatus?.running ? "Running Migration..." : "Migrate Saved Users"}
            </button>
          </div>
          <AnimatePresence mode="wait">
            {migrationStatus && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-3.5 rounded-xl border flex items-start gap-2 text-xs font-semibold ${migrationStatus.success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : migrationStatus.running ? "bg-indigo-50 border-indigo-100 text-indigo-800 animate-pulse" : "bg-rose-50 border-rose-100 text-rose-800"}`}
              >
                {migrationStatus.success ? (
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={16} className={`${migrationStatus.running ? "text-indigo-600" : "text-rose-600"} mt-0.5 shrink-0`} />
                )}
                <div>
                  <p>{migrationStatus.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => {
          const config = ROLE_CONFIG[user.role] || ROLE_CONFIG[UserRole.STAFF];
          const Icon = config.icon;

          return (
            <motion.div 
              layout
              key={user.uid}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                      {user.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-lg ${config.bg} ${config.color} border border-white shadow-sm`}>
                    <Icon size={12} />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {user.displayName}
                    {user.role === UserRole.ADMIN && <ShieldCheck size={14} className="text-rose-500" />}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Mail size={10} /> {user.email}
                    </span>
                    <span className="hidden md:inline w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium lowercase">
                      <Clock size={10} /> Joined {(() => {
                        const createdAt = user.createdAt as any;
                        if (!createdAt) return "Unknown";
                        if (typeof createdAt.seconds === 'number') {
                          return new Date(createdAt.seconds * 1000).toLocaleDateString();
                        }
                        const d = new Date(createdAt);
                        return isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString();
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Level</label>
                  <select
                    disabled={updating === user.uid || !isSuperAdmin}
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all appearance-none cursor-pointer bg-slate-50 ${updating === user.uid || !isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-300 focus:ring-4 focus:ring-indigo-50 border-slate-200'}`}
                  >
                    {Object.entries(UserRole).map(([key, value]) => (
                      <option key={key} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hidden lg:flex flex-col items-end gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AUTHORIZED
                </div>
              </div>
            </motion.div>
          );
        })}

        {users.length === 0 && (
          <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            <UserCog size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No system users found</p>
          </div>
        )}
      </div>
    </div>
  );
};
