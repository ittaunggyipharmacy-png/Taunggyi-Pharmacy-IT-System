import React, { useState, useEffect } from 'react';
import { Shield, Video, HardDrive, Plus, CheckCircle, AlertTriangle, ListFilter, Activity, Lock, Eye } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { BackupLog, CCTVRequest, AuditLog } from '../types';
import { saveBackupLog, saveCCTVRequest } from '../services/firestoreService';

interface SecurityModuleProps {
  backups: BackupLog[];
  cctvRequests?: CCTVRequest[];
  isAdmin: boolean;
}

export function SecurityModule({ backups, cctvRequests = [], isAdmin }: SecurityModuleProps) {
  const [activeTab, setActiveTab] = useState<'backups' | 'cctv' | 'audit'>('audit');
  const [isAddingBackup, setIsAddingBackup] = useState(false);
  const [isAddingCCTV, setIsAddingCCTV] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>('ALL');

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as AuditLog));
    }, (err) => {
      console.warn("Audit logs stream notice:", err.message);
    });
    return () => unsub();
  }, []);

  const [newBackup, setNewBackup] = useState<Partial<BackupLog>>({
    storageType: 'Cloud Storage',
    status: 'Success',
    date: new Date().toISOString().split('T')[0],
    performer: 'IT Admin'
  });

  const [newCCTV, setNewCCTV] = useState<Partial<CCTVRequest>>({
    dateOfFootage: new Date().toISOString().split('T')[0],
    reason: '',
    approvalStatus: 'Pending',
    requester: ''
  });

  const handleSaveBackup = async () => {
    try {
      await saveBackupLog(newBackup);
      setIsAddingBackup(false);
    } catch (err) {
      console.error("Failed to save backup log", err);
    }
  };

  const handleSaveCCTV = async () => {
    try {
      await saveCCTVRequest(newCCTV);
      setIsAddingCCTV(false);
    } catch (err) {
      console.error("Failed to save CCTV request", err);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (auditFilter !== 'ALL' && log.targetCollection !== auditFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security & Audit Center</h1>
          <p className="text-xs text-slate-500 mt-1">Enterprise immutable audit trail, CCTV surveillance access, and database integrity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Activity size={15} />
            <span>Immutable Audit Logs ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'backups' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <HardDrive size={15} />
            <span>Backup Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('cctv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'cctv' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Video size={15} />
            <span>CCTV Audit</span>
          </button>
        </div>
      </div>

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tamper-Proof Audit Records</h3>
            </div>
            
            <select
              value={auditFilter}
              onChange={e => setAuditFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Target Collections</option>
              <option value="access_requests">Access Requests</option>
              <option value="purchase_requisitions">Purchase Requisitions</option>
              <option value="purchase_orders">Purchase Orders</option>
              <option value="goods_receipts">Goods Receipts</option>
              <option value="invoices_and_matches">Invoices & Matching</option>
              <option value="offboarding">Offboarding Revocations</option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Actor</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Target Scope</th>
                    <th className="p-3.5">Details</th>
                    <th className="p-3.5 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No audit records found matching criteria. Actions in Access & Procurement are recorded immutably.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{log.actorEmail || log.actorUid}</div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{log.actorRole}</span>
                        </td>
                        <td className="p-3.5 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                          {log.action}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">
                          {log.targetCollection}/{log.targetDocId?.slice(0, 8)}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {log.details || JSON.stringify(log.newState || {})}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="p-1 text-slate-400 hover:text-indigo-500 rounded"
                            title="Inspect Audit Payload"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backups' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Database & Cloud Backups</h3>
            {isAdmin && (
              <button
                onClick={() => setIsAddingBackup(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                <Plus size={14} />
                <span>Log Backup</span>
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Target / Storage</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Performer</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">No backup records found</td>
                  </tr>
                ) : (
                  backups.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">{log.storageType}</td>
                      <td className="p-3.5 font-mono text-slate-400">{log.date}</td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">{log.performer || 'System'}</td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle size={10} />
                          <span>{log.status || 'Verified'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'cctv' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Surveillance Footage Requests</h3>
            <button
              onClick={() => setIsAddingCCTV(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              <Plus size={14} />
              <span>New Request</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cctvRequests.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                No CCTV footage requests recorded.
              </div>
            ) : (
              cctvRequests.map((req) => (
                <div key={req.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{req.requester}</span>
                    <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700">{req.approvalStatus}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{req.reason}</p>
                  <div className="text-2xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <span>Date of Footage: {req.dateOfFootage}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Audit Log Detail Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Audit Event Detail</h3>
                <span className="text-2xs font-mono text-indigo-500">{selectedAuditLog.id}</span>
              </div>
              <button onClick={() => setSelectedAuditLog(null)} className="text-slate-400 hover:text-slate-200 text-xs font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-2xs block">Action</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedAuditLog.action}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-2xs block">Actor</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">{selectedAuditLog.actorEmail || selectedAuditLog.actorUid}</span>
                </div>
              </div>

              <div>
                <span className="text-2xs font-semibold uppercase text-slate-400 block mb-1">State Transition / Details</span>
                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-2xs rounded-xl overflow-x-auto max-h-60">
                  {JSON.stringify({
                    details: selectedAuditLog.details,
                    previousState: selectedAuditLog.previousState,
                    newState: selectedAuditLog.newState,
                    ip: selectedAuditLog.ipAddress,
                    timestamp: selectedAuditLog.timestamp
                  }, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityModule;
