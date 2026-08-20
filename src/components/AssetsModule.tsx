import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Laptop, 
  Monitor, 
  HardDrive, 
  CheckCircle, 
  Wrench, 
  AlertCircle, 
  QrCode, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  Server
} from 'lucide-react';
import { ITAsset, Status, SystemSettings } from '../types';
import { saveAsset, deleteAsset } from '../services/firestoreService';

interface AssetsModuleProps {
  assets: ITAsset[];
  searchTerm?: string;
  isAdmin: boolean;
  settings?: SystemSettings;
}

export function AssetsModule({ assets, searchTerm = "", isAdmin, settings }: AssetsModuleProps) {
  const [assetSearch, setAssetSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ITAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newAsset, setNewAsset] = useState<Partial<ITAsset>>({
    category: 'Computer',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'Active',
    department: 'IT',
    location: 'Central Storage',
    assignedTo: 'Unassigned'
  });

  const filteredAssets = assets.filter((asset) => {
    const searchLower = (searchTerm || assetSearch).toLowerCase();
    const matchesCategory = filterCategory === "All" || asset.category === filterCategory;
    const matchesStatus = filterStatus === "All" || asset.status === filterStatus;
    const matchesDept = filterDept === "All" || asset.department === filterDept;

    const matchesSearch = !searchTerm && !assetSearch ||
      (asset.asset_code && asset.asset_code.toLowerCase().includes(searchLower)) ||
      (asset.model && asset.model.toLowerCase().includes(searchLower)) ||
      (asset.brand && asset.brand.toLowerCase().includes(searchLower)) ||
      (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchLower)) ||
      (asset.assignedTo && asset.assignedTo.toLowerCase().includes(searchLower));

    return matchesCategory && matchesStatus && matchesDept && matchesSearch;
  });

  const handleSaveNew = async () => {
    if (!newAsset.model) return;
    setIsSaving(true);
    try {
      await saveAsset(newAsset);
      setIsAdding(false);
      setNewAsset({
        category: 'Computer',
        brand: '',
        model: '',
        serialNumber: '',
        status: 'Active',
        department: 'IT',
        location: 'Central Storage',
        assignedTo: 'Unassigned'
      });
    } catch (err) {
      console.error("Failed to save asset:", err);
      alert(`Asset save failed: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAsset) return;
    setIsSaving(true);
    try {
      await saveAsset(editingAsset);
      setEditingAsset(null);
    } catch (err) {
      console.error("Failed to update asset:", err);
      alert(`Asset update failed: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    try {
      await deleteAsset(id);
    } catch (err) {
      console.error("Failed to delete asset:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hardware & IT Assets</h1>
          <p className="text-xs text-slate-500 mt-1">Lifecycle management, warranty tracking, and serial inventory</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Register Asset</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search assets or codes..."
            value={assetSearch}
            onChange={(e) => setAssetSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="All">All Categories</option>
          <option value="Computer">Computer / PC</option>
          <option value="Monitor">Monitor</option>
          <option value="Network">Network Device</option>
          <option value="Printer">Printer</option>
          <option value="Server">Server</option>
          <option value="Keyboard">Keyboard</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Under Repair">Under Repair</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="All">All Departments</option>
          <option value="IT">IT</option>
          <option value="Merchandising">Merchandising</option>
          <option value="Digital Marketing">Digital Marketing</option>
          <option value="Accounts">Accounts</option>
          <option value="Management">Management</option>
        </select>
      </div>

      {/* Asset Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Asset Code</th>
              <th className="p-3.5">Category & Model</th>
              <th className="p-3.5">Serial Number</th>
              <th className="p-3.5">Assigned User</th>
              <th className="p-3.5">Location / Dept</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No assets found matching criteria.
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {asset.asset_code || asset.id.slice(0, 8)}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{asset.brand} {asset.model}</div>
                    <span className="text-2xs text-slate-400">{asset.category}</span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-500">{asset.serialNumber || 'N/A'}</td>
                  <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">{asset.assignedTo || 'Unassigned'}</td>
                  <td className="p-3.5 text-slate-500">
                    <div>{asset.location}</div>
                    <span className="text-2xs text-slate-400">{asset.department}</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-2xs font-semibold ${
                      asset.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditingAsset(asset)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                      >
                        <Edit3 size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Asset Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Hardware Asset</h3>
            <p className="text-xs text-slate-500">Asset code is generated atomically server-side</p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Computer">Computer</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Network">Network Device</option>
                    <option value="Printer">Printer</option>
                    <option value="Keyboard">Keyboard</option>
                    <option value="Server">Server</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Dell, HP, Lenovo"
                    value={newAsset.brand || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OptiPlex 3080 Micro"
                  value={newAsset.model || ""}
                  onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="SN-12345"
                    value={newAsset.serialNumber || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Assigned User</label>
                  <input
                    type="text"
                    placeholder="e.g. Daw Khin"
                    value={newAsset.assignedTo || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Location</label>
                  <input
                    type="text"
                    value={newAsset.location || "Central Storage"}
                    onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Department</label>
                  <select
                    value={newAsset.department || "IT"}
                    onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="IT">IT</option>
                    <option value="Merchandising">Merchandising</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNew}
                disabled={isSaving || !newAsset.model}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
              >
                {isSaving ? "Creating..." : "Save Asset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Asset: {editingAsset.asset_code}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Model</label>
                <input
                  type="text"
                  value={editingAsset.model || ""}
                  onChange={(e) => setEditingAsset({ ...editingAsset, model: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={editingAsset.status}
                    onChange={(e) => setEditingAsset({ ...editingAsset, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={editingAsset.assignedTo || ""}
                    onChange={(e) => setEditingAsset({ ...editingAsset, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingAsset(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
              >
                {isSaving ? "Saving..." : "Update Asset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetsModule;
