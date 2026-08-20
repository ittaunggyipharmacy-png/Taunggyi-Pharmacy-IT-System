import React, { useState, useMemo } from 'react';
import { ITAsset, SystemSettings } from '../types';
import { DepartmentSelect } from './DepartmentSelect';
import { 
  Search, 
  Filter, 
  Plus, 
  QrCode, 
  ArrowRightLeft, 
  Wrench, 
  Trash2, 
  Eye, 
  CheckSquare, 
  Square,
  FileSpreadsheet,
  Building2,
  Tag,
  User,
  Edit3
} from 'lucide-react';

interface AssetRegistryTableProps {
  assets: ITAsset[];
  onSelectAsset: (asset: ITAsset) => void;
  onOpenAddModal: () => void;
  onOpenEdit: (asset: ITAsset) => void;
  onDeleteAsset: (assetId: string) => void;
  onOpenAssign: (asset: ITAsset) => void;
  onOpenTransfer: (asset: ITAsset) => void;
  onOpenRepair: (asset: ITAsset) => void;
  onOpenLabels: (asset: ITAsset) => void;
  onDispose: (assetId: string) => void;
  isAdmin: boolean;
  departments: string[];
  settings?: SystemSettings;
}

export function AssetRegistryTable({
  assets,
  onSelectAsset,
  onOpenAddModal,
  onOpenEdit,
  onDeleteAsset,
  onOpenAssign,
  onOpenTransfer,
  onOpenRepair,
  onOpenLabels,
  onDispose,
  isAdmin,
  departments
}: AssetRegistryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterCondition, setFilterCondition] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter & Search
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        (asset.asset_code?.toLowerCase().includes(q)) ||
        (asset.model?.toLowerCase().includes(q)) ||
        (asset.brand?.toLowerCase().includes(q)) ||
        (asset.serialNumber?.toLowerCase().includes(q)) ||
        (asset.assignedTo?.toLowerCase().includes(q)) ||
        (asset.department?.toLowerCase().includes(q)) ||
        (asset.location?.toLowerCase().includes(q)) ||
        (asset.detailedSpecs?.imei1?.toLowerCase().includes(q)) ||
        (asset.detailedSpecs?.networkIp?.toLowerCase().includes(q));

      const matchesCat = filterCategory === 'All' || asset.category === filterCategory;
      const matchesStatus = filterStatus === 'All' || asset.status === filterStatus;
      const matchesDept = filterDept === 'All' || asset.department === filterDept;
      const matchesCond = filterCondition === 'All' || asset.condition === filterCondition;

      return matchesSearch && matchesCat && matchesStatus && matchesDept && matchesCond;
    });
  }, [assets, searchQuery, filterCategory, filterStatus, filterDept, filterCondition]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage) || 1;
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedAssets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedAssets.map(a => a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, serial, brand, model, employee, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Register Asset
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Categories</option>
            <option value="Computer">Computer</option>
            <option value="Printer">Printer</option>
            <option value="Network">Network</option>
            <option value="Mobile">Mobile / Phone</option>
            <option value="Scanner">Scanner</option>
            <option value="CCTV">CCTV</option>
            <option value="Peripherals">Peripherals</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Assigned">Assigned</option>
            <option value="In Stock">In Stock</option>
            <option value="Under Repair">Under Repair</option>
            <option value="Retired">Retired</option>
            <option value="Disposed">Disposed</option>
          </select>

          <DepartmentSelect
            value={filterDept === 'All' ? '' : filterDept}
            onChange={(val) => setFilterDept(val || 'All')}
            placeholder="All Departments"
          />

          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Conditions</option>
            <option value="Brand New">Brand New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Needs Repair">Needs Repair</option>
            <option value="Damaged">Damaged</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-2xs">
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedIds.length > 0 && selectedIds.length === paginatedAssets.length ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="p-4">Asset Code</th>
                <th className="p-4">Name / Model</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4">Condition</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Department</th>
                <th className="p-4">Location</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No matching assets found in the registry.
                  </td>
                </tr>
              ) : (
                paginatedAssets.map(asset => {
                  const isSelected = selectedIds.includes(asset.id);
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <button onClick={() => toggleSelectOne(asset.id)} className="text-slate-400 hover:text-slate-600">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {asset.asset_code || 'Pending'}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {asset.model}
                        <span className="block text-2xs text-slate-400 font-normal">SN: {asset.serialNumber || 'N/A'}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {asset.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                          asset.status === 'Active' || asset.status === 'Assigned' 
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : asset.status === 'Under Repair' || asset.status === 'Maintenance'
                            ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {asset.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{asset.condition || 'Good'}</span>
                      </td>
                      <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                        {asset.assignedTo || 'Unassigned'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {asset.department || 'IT'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {asset.location || 'Central Storage'}
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <button
                          onClick={() => onSelectAsset(asset)}
                          title="View Detail Profile"
                          className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenEdit(asset)}
                          title="Edit Asset"
                          className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 hover:bg-amber-100 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenLabels(asset)}
                          title="Generate QR Label"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => onDeleteAsset(asset.id)}
                            title="Delete Asset"
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div>
            Showing {paginatedAssets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAssets.length)} of {filteredAssets.length} assets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Previous
            </button>
            <span className="font-mono px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
