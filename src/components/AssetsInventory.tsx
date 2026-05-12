import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ITAsset } from '../types';

export const AssetsInventory: React.FC = () => {
  const { assets } = useAppStore();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Assets Inventory Purchase Records</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-3">Asset ID</th>
              <th className="px-6 py-3">Model</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset: ITAsset) => (
              <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-6 py-4 font-mono">{asset.id}</td>
                <td className="px-6 py-4">{asset.model}</td>
                <td className="px-6 py-4">
                    <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium",
                        asset.status === 'Active' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    )}>
                        {asset.status}
                    </span>
                </td>
                <td className="px-6 py-4">{asset.assignedTo || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper for classes until I can import it properly from utilities
function cn(...inputs: any[]) {
    // Basic implementation since I can't import the actual cn() yet
    return inputs.filter(Boolean).join(' ');
}
