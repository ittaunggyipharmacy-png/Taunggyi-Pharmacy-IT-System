import React, { useState } from 'react';
import { X, Play, RefreshCw, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { runAdminMigration } from '../services/firestoreService';

interface AdminMigrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminMigrationsModal({ isOpen, onClose }: AdminMigrationsModalProps) {
  const [selectedJob, setSelectedJob] = useState('STANDARDIZE_ASSET_CODES');
  const [dryRun, setDryRun] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const idempotencyKey = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await runAdminMigration(selectedJob, idempotencyKey, dryRun);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Migration execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">Server-Side Admin Migrations</h3>
              <p className="text-xs text-slate-500">Idempotent, versioned migration jobs with preflight validation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Select Migration Job
            </label>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="STANDARDIZE_ASSET_CODES">Standardize Asset Codes (TG-PC-XXX Sequence)</option>
              <option value="IMPORT_PREDEFINED_KEYBOARDS">Import Keyboards SOP Data</option>
            </select>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Dry Run Mode (Preflight Validation)</p>
                <p className="text-xs text-slate-500">Validates document schemas without writing changes to the database</p>
              </div>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Execution Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                <CheckCircle size={16} />
                <span>Job Completed {result.dryRun ? '(Dry Run Only)' : '(Committed to DB)'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-lg text-center">
                  <span className="text-slate-500 block text-2xs">Total</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{result.results?.total || 0}</span>
                </div>
                <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-lg text-center">
                  <span className="text-slate-500 block text-2xs">Succeeded</span>
                  <span className="text-sm font-bold text-emerald-600">{result.results?.succeeded || 0}</span>
                </div>
                <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-lg text-center">
                  <span className="text-slate-500 block text-2xs">Failed</span>
                  <span className="text-sm font-bold text-rose-600">{result.results?.failed || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
          >
            Close
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{dryRun ? 'Execute Dry Run' : 'Commit Migration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default AdminMigrationsModal;
