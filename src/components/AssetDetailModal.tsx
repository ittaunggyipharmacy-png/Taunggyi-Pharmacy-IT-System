import React, { useState } from 'react';
import { ITAsset } from '../types';
import { 
  X, 
  Tag, 
  MapPin, 
  User, 
  Building2, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  FileText, 
  Wrench, 
  History, 
  QrCode, 
  ArrowRightLeft, 
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AssetDetailModalProps {
  asset: ITAsset;
  onClose: () => void;
  onOpenAssign: (asset: ITAsset) => void;
  onOpenTransfer: (asset: ITAsset) => void;
  onOpenReturn: (asset: ITAsset) => void;
  onOpenRepair: (asset: ITAsset) => void;
  onOpenLabels: (asset: ITAsset) => void;
  onDispose: (assetId: string) => void;
  isAdmin: boolean;
}

export function AssetDetailModal({
  asset,
  onClose,
  onOpenAssign,
  onOpenTransfer,
  onOpenReturn,
  onOpenRepair,
  onOpenLabels,
  onDispose,
  isAdmin
}: AssetDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'history' | 'repairs' | 'docs' | 'timeline'>('overview');

  const formatMMK = (val?: number) => {
    if (!val) return '0 MMK';
    return new Intl.NumberFormat('en-US').format(val) + ' MMK';
  };

  // Calculate Total Cost of Ownership
  const purchaseCost = asset.purchasePrice || asset.itemPrice || 0;
  const totalRepairCost = asset.repairRecords?.reduce((sum, r) => sum + (r.repairCost || 0), 0) || asset.totalRepairCost || 0;
  const tco = purchaseCost + totalRepairCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{asset.model}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">{asset.asset_code || 'Unassigned Code'}</span>
              </div>
              <p className="text-xs text-slate-500">Category: {asset.category} • Serial: {asset.serialNumber || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenLabels(asset)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
            >
              <QrCode className="w-4 h-4" /> QR Label
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-950/20 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Tag },
            { id: 'specs', label: 'Specifications', icon: FileText },
            { id: 'history', label: 'Assignment History', icon: History },
            { id: 'repairs', label: 'Maintenance & Repairs', icon: Wrench },
            { id: 'docs', label: 'Documents & Photos', icon: FileText },
            { id: 'timeline', label: 'Activity Timeline', icon: RefreshCw },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  isActive 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block font-medium">Lifecycle Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {asset.status || 'Active'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block font-medium">Condition</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                    {asset.condition || 'Good'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block font-medium">Assigned Custodian</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-500" /> {asset.assignedTo || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location & Department */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Location & Department</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-500 flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Department</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{asset.department || 'IT'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-500 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Physical Location</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{asset.location || 'Central Storage'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500 flex items-center gap-1.5"><Tag className="w-4 h-4" /> Brand / Manufacturer</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{asset.brand || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Financial & Warranty Summary */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial & Warranty (TCO)</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-500">Purchase Cost</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatMMK(purchaseCost)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-500">Total Repair Cost</span>
                      <span className="font-mono font-bold text-orange-600">{formatMMK(totalRepairCost)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-500">Total Cost of Ownership (TCO)</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatMMK(tco)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500">Warranty Expiry</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{asset.warrantyEndDate || 'Not Specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contextual Quick Actions */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Contextual Lifecycle Actions</h4>
                  <p className="text-2xs text-indigo-600 dark:text-indigo-400 mt-0.5">Manage assignments, transfers, returns, or maintenance tickets.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onOpenAssign(asset)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" /> Assign Asset
                  </button>
                  <button
                    onClick={() => onOpenTransfer(asset)}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                  </button>
                  <button
                    onClick={() => onOpenReturn(asset)}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Return / Stock
                  </button>
                  <button
                    onClick={() => onOpenRepair(asset)}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Log Repair
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => onDispose(asset.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Dispose
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Category-Specific Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {asset.detailedSpecs ? (
                  Object.entries(asset.detailedSpecs)
                    .filter(([_, val]) => Boolean(val))
                    .map(([key, val]) => (
                      <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 text-2xs uppercase tracking-wider block mb-0.5">{key}</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{String(val)}</span>
                      </div>
                    ))
                ) : (
                  <div className="col-span-2 p-6 text-center text-slate-400">
                    {asset.specs || 'No advanced technical specifications logged for this asset.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Custody & Assignment History</h3>
              <div className="space-y-3">
                {(!asset.assignmentHistory || asset.assignmentHistory.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No prior assignment transfers recorded. Current holder: {asset.assignedTo}</div>
                ) : (
                  asset.assignmentHistory.map((h, i) => (
                    <div key={h.id || i} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600">{h.action}</span>
                          Assigned to: {h.newAssignee} ({h.newDepartment})
                        </span>
                        <span className="text-slate-400 font-mono text-2xs">{h.timestamp}</span>
                      </div>
                      <div className="text-2xs text-slate-500 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>Location: {h.newLocation}</div>
                        <div>Condition: {h.handoverCondition}</div>
                        <div>Issued By: {h.issuedByName}</div>
                      </div>
                      {h.reason && <div className="text-2xs text-slate-600 dark:text-slate-400 italic">Reason: {h.reason}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'repairs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Maintenance & Repair Records</h3>
                <button
                  onClick={() => onOpenRepair(asset)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  + Add Repair Log
                </button>
              </div>
              <div className="space-y-3">
                {(!asset.repairRecords || asset.repairRecords.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No maintenance or repair tickets recorded.</div>
                ) : (
                  asset.repairRecords.map((r, i) => (
                    <div key={r.id || i} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>Vendor: {r.vendorName}</span>
                        <span className="font-mono text-indigo-600">{formatMMK(r.repairCost)}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{r.issueDescription}</p>
                      <div className="flex items-center justify-between text-2xs text-slate-400">
                        <span>Status: <strong className="text-slate-700 dark:text-slate-200">{r.status}</strong></span>
                        <span>Reported: {r.reportedDate}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Attached Documents & Photos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(!asset.documents || asset.documents.length === 0) ? (
                  <div className="col-span-2 text-center py-8 text-slate-400 text-xs">No documents or photos uploaded for this asset.</div>
                ) : (
                  asset.documents.map((d, i) => (
                    <div key={d.id || i} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{d.name}</span>
                        <span className="text-2xs text-slate-400">{d.type} • {d.uploadedAt}</span>
                      </div>
                      <a href={d.url} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-xs font-semibold">View</a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Immutable Activity Audit Trail</h3>
              <div className="space-y-3">
                {(!asset.activityTimeline || asset.activityTimeline.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No audit events logged yet.</div>
                ) : (
                  asset.activityTimeline.map((ev, i) => (
                    <div key={ev.id || i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>{ev.action}</span>
                        <span className="text-2xs font-mono text-slate-400">{ev.timestamp}</span>
                      </div>
                      <div className="text-2xs text-slate-500">Actor: {ev.actorName} ({ev.actorUid})</div>
                      {ev.details && <div className="text-2xs text-indigo-600 dark:text-indigo-400 font-mono">{ev.details}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
