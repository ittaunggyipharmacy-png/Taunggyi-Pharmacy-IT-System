import React, { useState } from 'react';
import { Shield, Video, HardDrive, Plus, CheckCircle, AlertTriangle } from 'lucide-react';
import { BackupLog, CCTVRequest } from '../types';
import { saveBackupLog, saveCCTVRequest } from '../services/firestoreService';

interface SecurityModuleProps {
  backups: BackupLog[];
  cctvRequests?: CCTVRequest[];
  isAdmin: boolean;
}

export function SecurityModule({ backups, cctvRequests = [], isAdmin }: SecurityModuleProps) {
  const [activeTab, setActiveTab] = useState<'backups' | 'cctv'>('backups');
  const [isAddingBackup, setIsAddingBackup] = useState(false);
  const [isAddingCCTV, setIsAddingCCTV] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security & Audit Center</h1>
          <p className="text-xs text-slate-500 mt-1">Data protection logs, CCTV request auditing, and system integrity</p>
        </div>
        <div className="flex gap-2">
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
    </div>
  );
}

export default SecurityModule;
