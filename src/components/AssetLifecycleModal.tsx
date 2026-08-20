import React, { useState } from 'react';
import { ITAsset } from '../types';
import { X, User, ArrowRightLeft, RefreshCw, Wrench } from 'lucide-react';

interface AssetLifecycleModalProps {
  asset: ITAsset | null;
  mode: 'assign' | 'transfer' | 'return' | 'repair' | null;
  onClose: () => void;
  onSubmitAction: (actionType: string, payload: any) => Promise<void>;
  departments: string[];
  locations: string[];
}

export function AssetLifecycleModal({
  asset,
  mode,
  onClose,
  onSubmitAction,
  departments,
  locations
}: AssetLifecycleModalProps) {
  if (!asset || !mode) return null;

  const [assignee, setAssignee] = useState(asset.assignedTo || '');
  const [department, setDepartment] = useState(asset.department || departments[0] || 'IT');
  const [location, setLocation] = useState(asset.location || locations[0] || 'Central Storage');
  const [condition, setCondition] = useState<'Brand New' | 'Good' | 'Fair' | 'Needs Repair' | 'Damaged'>('Good');
  const [reason, setReason] = useState('');
  const [repairCost, setRepairCost] = useState(25000);
  const [vendorName, setVendorName] = useState('KMD Service Center');
  const [issueDescription, setIssueDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'assign') {
        await onSubmitAction('assign', {
          newAssignee: assignee,
          newDepartment: department,
          newLocation: location,
          handoverCondition: condition,
          reason
        });
      } else if (mode === 'transfer') {
        await onSubmitAction('transfer', {
          previousAssignee: asset.assignedTo,
          previousDepartment: asset.department,
          newAssignee: assignee,
          newDepartment: department,
          newLocation: location,
          reason
        });
      } else if (mode === 'return') {
        await onSubmitAction('return', {
          returnCondition: condition,
          reason
        });
      } else if (mode === 'repair') {
        await onSubmitAction('repair', {
          repairCost: Number(repairCost) || 0,
          vendorName,
          issueDescription
        });
      }
      onClose();
    } catch (err) {
      console.error("Lifecycle action failed:", err);
      alert('Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
              {mode === 'assign' && <User className="w-4 h-4" />}
              {mode === 'transfer' && <ArrowRightLeft className="w-4 h-4" />}
              {mode === 'return' && <RefreshCw className="w-4 h-4" />}
              {mode === 'repair' && <Wrench className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                {mode === 'assign' && 'Assign Asset to Custodian'}
                {mode === 'transfer' && 'Transfer Asset Custody'}
                {mode === 'return' && 'Return Asset to Stock'}
                {mode === 'repair' && 'Log Maintenance / Repair Ticket'}
              </h3>
              <span className="text-2xs font-mono text-indigo-500">{asset.asset_code} • {asset.model}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'assign' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Name / Assignee *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ko Kyaw Min"
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl">
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Physical Location</label>
                <select value={location} onChange={e => setLocation(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl">
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Handover Condition</label>
                <select value={condition} onChange={e => setCondition(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl">
                  <option value="Brand New">Brand New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
            </>
          )}

          {mode === 'transfer' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">New Assignee *</label>
                <input
                  type="text"
                  required
                  placeholder="New employee name"
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">New Department</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl">
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Transfer Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Department reorganization or promotion"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>
            </>
          )}

          {mode === 'return' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Return Condition *</label>
                <select value={condition} onChange={e => setCondition(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl">
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Needs Repair">Needs Repair</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Return / Audit Notes</label>
                <textarea
                  rows={3}
                  placeholder="Accessories checked, reason for return..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>
            </>
          )}

          {mode === 'repair' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vendor / Repair Center</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estimated / Actual Repair Cost (MMK)</label>
                <input
                  type="number"
                  value={repairCost}
                  onChange={e => setRepairCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Issue Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe hardware failure or service required..."
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>
            </>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold text-white shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
