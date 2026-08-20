import React from 'react';
import { ITAsset } from '../types';
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  ShieldAlert, 
  Calendar, 
  DollarSign, 
  Tag,
  Building2
} from 'lucide-react';

interface AssetDashboardProps {
  assets: ITAsset[];
  onSelectAsset: (asset: ITAsset) => void;
  onNavigateTab: (tab: string) => void;
}

export function AssetDashboard({ assets, onSelectAsset, onNavigateTab }: AssetDashboardProps) {
  // Calculations
  const totalAssets = assets.length;
  const assignedAssets = assets.filter(a => a.status === 'Assigned' || (a.status === 'Active' && a.assignedTo && a.assignedTo !== 'Unassigned')).length;
  const unassignedAssets = assets.filter(a => !a.assignedTo || a.assignedTo === 'Unassigned' || a.status === 'In Stock' || a.status === 'New').length;
  const inRepairAssets = assets.filter(a => a.status === 'Under Repair' || a.status === 'Maintenance').length;
  const damagedAssets = assets.filter(a => a.condition === 'Damaged' || a.condition === 'Needs Repair').length;

  // Warranty expiring in 30 days
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const warrantyExpiringSoon = assets.filter(a => {
    if (!a.warrantyEndDate) return false;
    const exp = new Date(a.warrantyEndDate);
    return exp >= now && exp <= thirtyDaysLater;
  });

  // Total Asset Value in MMK
  const totalAssetValue = assets.reduce((sum, a) => {
    if (a.status === 'Disposed' || a.status === 'Retired') return sum;
    const price = typeof a.purchasePrice === 'number' ? a.purchasePrice : (a.itemPrice || 0);
    return sum + price;
  }, 0);

  // Category breakdown
  const categoryCounts = assets.reduce((acc, a) => {
    const cat = a.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Department breakdown
  const departmentCounts = assets.reduce((acc, a) => {
    const dept = a.department || 'General';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatMMK = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val) + ' MMK';
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Assets</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalAssets}</h3>
            <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">Active inventory registry</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned / Active</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{assignedAssets}</h3>
            <span className="text-2xs text-indigo-600 dark:text-indigo-400 font-medium mt-1 inline-block">Deployed to personnel</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unassigned / Stock</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{unassignedAssets}</h3>
            <span className="text-2xs text-amber-600 dark:text-amber-400 font-medium mt-1 inline-block">Ready for deployment</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Asset Value</span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatMMK(totalAssetValue)}</h3>
            <span className="text-2xs text-blue-600 dark:text-blue-400 font-medium mt-1 inline-block">Valuation in MMK</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Secondary Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-400">Under Repair / Maintenance</span>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{inRepairAssets} Assets</div>
          </div>
          <div className="p-2.5 bg-orange-50 dark:bg-orange-950/50 text-orange-600 rounded-xl">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-400">Damaged / Needs Attention</span>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{damagedAssets} Assets</div>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-400">Warranty Expiring (&lt;30d)</span>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{warrantyExpiringSoon.length} Assets</div>
          </div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Breakdown Grid & Actionable Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" /> Assets by Category
          </h3>
          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const percentage = Math.round((count / totalAssets) * 100) || 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{cat}</span>
                    <span className="text-slate-500 font-mono">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" /> Department Allocation
          </h3>
          <div className="space-y-3">
            {Object.entries(departmentCounts).map(([dept, count]) => {
              const percentage = Math.round((count / totalAssets) * 100) || 0;
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{dept}</span>
                    <span className="text-slate-500 font-mono">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actionable Warranty & Repair Alerts Widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Urgent Action Required
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {warrantyExpiringSoon.length === 0 && inRepairAssets === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No urgent warranty expirations or pending repairs. All systems nominal.
              </div>
            ) : (
              <>
                {warrantyExpiringSoon.map(asset => (
                  <div key={asset.id} onClick={() => onSelectAsset(asset)} className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-800 dark:text-purple-300">
                      <span>{asset.asset_code || 'Asset'} - {asset.model}</span>
                      <span className="text-2xs px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100">Warranty Expiring</span>
                    </div>
                    <div className="text-2xs text-purple-600 dark:text-purple-400 mt-1">
                      Expires: {asset.warrantyEndDate} • Assigned to: {asset.assignedTo}
                    </div>
                  </div>
                ))}
                {assets.filter(a => a.status === 'Under Repair').map(asset => (
                  <div key={asset.id} onClick={() => onSelectAsset(asset)} className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/50 transition">
                    <div className="flex items-center justify-between text-xs font-bold text-orange-800 dark:text-orange-300">
                      <span>{asset.asset_code || 'Asset'} - {asset.model}</span>
                      <span className="text-2xs px-2 py-0.5 rounded bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100">Under Repair</span>
                    </div>
                    <div className="text-2xs text-orange-600 dark:text-orange-400 mt-1">
                      Location: {asset.location} • Dept: {asset.department}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
