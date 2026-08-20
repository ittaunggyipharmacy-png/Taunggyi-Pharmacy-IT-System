import React, { useState } from 'react';
import { 
  Shield, 
  Layers, 
  Globe, 
  FileSpreadsheet, 
  Database, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Users,
  Settings as SettingsIcon,
  X,
  AlertCircle
} from 'lucide-react';
import { SystemSettings, UserRole, RolePermission } from '../types';
import { saveSettings, wipeDatabaseServer } from '../services/firestoreService';
import { validateDepartmentName, sortDepartments } from '../utils/departmentUtils';
import UserManagement from './UserManagement';
import AdminMigrationsModal from './AdminMigrationsModal';
import ExcelImportModal from './ExcelImportModal';

interface SettingsModuleProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  isAdmin: boolean;
  allNavItems?: any[];
}

export function SettingsModule({
  settings,
  setSettings,
  isAdmin,
  allNavItems = []
}: SettingsModuleProps) {
  const [newDept, setNewDept] = useState('');
  const [deptError, setDeptError] = useState<string | null>(null);
  const [newLoc, setNewLoc] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLoc, setNewBranchLoc] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  
  const [showMigrationsModal, setShowMigrationsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Super-admin wipe state
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmation, setWipeConfirmation] = useState('');
  const [backupVerified, setBackupVerified] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState<string | null>(null);
  const [wipeError, setWipeError] = useState<string | null>(null);

  const addDept = () => {
    if (!isAdmin) return;
    setDeptError(null);
    const val = validateDepartmentName(newDept, settings.departments || []);
    if (!val.valid) {
      setDeptError(val.error || 'Invalid department');
      return;
    }

    const trimmed = newDept.trim();
    const updatedDepartments = sortDepartments([...(settings.departments || []), trimmed]);
    const updated = { ...settings, departments: updatedDepartments };
    setSettings(updated);
    saveSettings(updated);
    setNewDept('');
    setDeptError(null);
  };

  const removeDept = (deptToRemove: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to remove department "${deptToRemove}"?`)) return;
    const updatedDepts = (settings.departments || []).filter(
      d => (d || '').trim().toLowerCase() !== deptToRemove.trim().toLowerCase()
    );
    const updated = { ...settings, departments: updatedDepts };
    setSettings(updated);
    saveSettings(updated);
  };

  const addLoc = () => {
    if (!isAdmin || !newLoc.trim()) return;
    const updated = { ...settings, locations: [...(settings.locations || []), newLoc.trim()] };
    setSettings(updated);
    saveSettings(updated);
    setNewLoc('');
  };

  const addBranchNote = () => {
    if (!isAdmin || !newBranchName.trim() || !newBranchLoc.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      name: newBranchName.trim(),
      location: newBranchLoc.trim(),
      phone: newBranchPhone.trim()
    };
    const updated = {
      ...settings,
      branchNotes: [...(settings.branchNotes || []), newNote]
    };
    setSettings(updated);
    saveSettings(updated);
    setNewBranchName('');
    setNewBranchLoc('');
    setNewBranchPhone('');
  };

  const handleWipeDatabase = async () => {
    if (!isAdmin) return;
    if (wipeConfirmation !== 'DELETE ALL DATA CONFIRMED' || !backupVerified) return;

    setIsWiping(true);
    setWipeError(null);
    setWipeSuccess(null);

    try {
      const res = await wipeDatabaseServer(wipeConfirmation, backupVerified);
      setWipeSuccess(`Database reset successful. Processed ${res.deletedCount} items.`);
      setTimeout(() => setShowWipeModal(false), 2000);
    } catch (err: any) {
      setWipeError(err.message || 'Wipe failed');
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings & Administration</h1>
          <p className="text-xs text-slate-500 mt-1">Configure branches, organizational departments, user roles, and data maintenance</p>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <UserManagement isSuperAdmin={isAdmin} />
      </div>

      {/* Organizational Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Departments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
            <Layers size={18} className="text-indigo-600" />
            <span>Departments</span>
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  id="new-department-input"
                  type="text"
                  placeholder="e.g. Quality Assurance"
                  value={newDept}
                  onChange={(e) => {
                    setNewDept(e.target.value);
                    if (deptError) setDeptError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDept();
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  id="add-department-btn"
                  onClick={addDept}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Add
                </button>
              </div>
              {deptError && (
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-2xs font-medium">
                  <AlertCircle size={12} />
                  <span>{deptError}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1" id="departments-list">
            {(settings.departments || []).length === 0 ? (
              <p className="text-2xs text-slate-400 italic">No departments configured yet.</p>
            ) : (
              (settings.departments || []).map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium border border-slate-200/60 dark:border-slate-700/60"
                >
                  <span>{d}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => removeDept(d)}
                      className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                      title={`Remove ${d}`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Locations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
            <Globe size={18} className="text-emerald-600" />
            <span>Locations</span>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New location..."
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
              <button
                onClick={addLoc}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                Add
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(settings.locations || []).map((l) => (
              <span key={l} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium">
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Directory */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Branch Locations & Contact Directory</h3>
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Branch Name"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Address / Location"
              value={newBranchLoc}
              onChange={(e) => setNewBranchLoc(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={newBranchPhone}
              onChange={(e) => setNewBranchPhone(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
            <button
              onClick={addBranchNote}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
            >
              Add Branch
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {(settings.branchNotes || []).map((b) => (
            <div key={b.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
              <p className="font-bold text-xs text-slate-900 dark:text-white">{b.name}</p>
              <p className="text-2xs text-slate-500 mt-0.5">{b.location}</p>
              <p className="text-2xs text-indigo-600 font-mono mt-1">{b.phone}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Administrative Data Operations */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Server-Side Data Operations</h3>
            <p className="text-xs text-slate-500">Authorized super-admin tasks: versioned migrations, batch imports, and disaster recovery</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Run Migration Jobs</h4>
              <p className="text-2xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Standardize asset serial codes or import predefined hardware SOP data with dry-run protection.
              </p>
              <button
                onClick={() => setShowMigrationsModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Open Migrations
              </button>
            </div>

            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Resumable Excel Import</h4>
              <p className="text-2xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Batch import CSV or TSV spreadsheet rows with schema validation and chunked write batches.
              </p>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Open Batch Import
              </button>
            </div>

            <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300">Disaster Recovery Wipe</h4>
              <p className="text-2xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Server-side protected wipe with verified backup confirmation and immutable audit logging.
              </p>
              <button
                onClick={() => setShowWipeModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Super-Admin Wipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AdminMigrationsModal
        isOpen={showMigrationsModal}
        onClose={() => setShowMigrationsModal(false)}
      />

      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* Wipe Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Authorized Super-Admin Wipe</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will remove business collection documents. To confirm, verify backup and type 
              <span className="font-mono font-bold text-rose-600 select-all"> DELETE ALL DATA CONFIRMED</span>.
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={backupVerified}
                  onChange={(e) => setBackupVerified(e.target.checked)}
                  className="w-4 h-4 accent-rose-600"
                />
                <span>I have verified a recent backup exists</span>
              </label>

              <input
                type="text"
                placeholder="Type confirmation string..."
                value={wipeConfirmation}
                onChange={(e) => setWipeConfirmation(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>

            {wipeError && (
              <p className="text-xs text-rose-600">{wipeError}</p>
            )}

            {wipeSuccess && (
              <p className="text-xs text-emerald-600 font-semibold">{wipeSuccess}</p>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowWipeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeDatabase}
                disabled={isWiping || wipeConfirmation !== 'DELETE ALL DATA CONFIRMED' || !backupVerified}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                {isWiping ? 'Wiping...' : 'Execute Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsModule;
