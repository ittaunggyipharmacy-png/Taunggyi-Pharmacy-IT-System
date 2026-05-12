import React, { useState } from "react";
import { 
  Plus, 
  Download, 
  Search, 
  Trash2, 
  Edit2, 
  Monitor,
  Smartphone,
  Printer,
  Network,
  Cpu,
  MousePointer2,
  Keyboard,
  Usb,
  Wind
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store/useAppStore";
import { ITAsset } from "../types";
import { deleteAsset, updateAssetAssignment } from "../services/firestoreService";

// Helper for classes
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

interface AssetsModuleProps {
  searchTerm: string;
  isAdmin: boolean;
}

const isHistorical = (dateStr: string) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 30;
};

export const AssetsModule: React.FC<AssetsModuleProps> = ({ searchTerm, isAdmin }) => {
  const { assets, setAssets } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
  const [newAsset, setNewAsset] = useState<Partial<ITAsset>>({ category: "Computer", status: "Active" });
  const [filterDept, setFilterDept] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isDeleting, setIsDeleting] = useState(false);

  const departments = ["All", ...Array.from(new Set(assets.map(a => a.department || a.location).filter(Boolean)))];
  const categories = ["All", ...Array.from(new Set(assets.map(a => a.category).filter(Boolean)))];
  const statuses = ["All", ...Array.from(new Set(assets.map(a => a.status).filter(Boolean)))];

  const handleDelete = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      await deleteAsset(assetId);
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete asset. Insufficient permissions.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const assetDept = asset.department || asset.location;
    const matchesDept = filterDept === "All" || assetDept === filterDept;
    const matchesCategory = filterCategory === "All" || asset.category === filterCategory;
    const matchesStatus = filterStatus === "All" || asset.status === filterStatus;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      asset.id.toLowerCase().includes(searchLower) ||
      asset.model.toLowerCase().includes(searchLower) ||
      (asset.brand?.toLowerCase() || "").includes(searchLower) ||
      (asset.serialNumber?.toLowerCase() || "").includes(searchLower) ||
      (asset.assignedTo?.toLowerCase() || "").includes(searchLower);

    return matchesDept && matchesCategory && matchesStatus && matchesSearch;
  });

  const currentAssets = filteredAssets.filter(a => !isHistorical(a.purchaseDate));
  const historicalAssets = filteredAssets.filter(a => isHistorical(a.purchaseDate));

  const handleAddAsset = async () => {
    if (!newAsset.model || !newAsset.serialNumber) return;

    // Validation
    const isAssigned = newAsset.assignedTo && newAsset.assignedTo !== "Unassigned";
    const targetStatus = newAsset.status || (isEditing ? selectedAsset?.status : "New");
    const allowedStatuses = ["Active", "In Stock", "New"];

    if (isAssigned && !allowedStatuses.includes(targetStatus as string)) {
      alert(`⚠️ SOP-001 Validation Error: Assets in '${targetStatus}' status cannot be assigned to a user.`);
      return;
    }
    
    // logic...
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center enterprise-card p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">IT Assets Inventory</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest leading-loose">Total Managed Objects: {assets.length}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus size={16} /> Register Asset
          </button>
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="uppercase tracking-widest text-slate-400 font-bold text-[9px]">
                <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10">ID</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Model & Brand</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 font-mono font-bold text-[10px]">{asset.id}</td>
                        <td className="px-6 py-4">
                            <span className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase">
                                {asset.category === "Computer" ? <Monitor size={12} /> : asset.category === "Mobile" ? <Smartphone size={12} /> : <Cpu size={12} />}
                                {asset.category}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-800">{asset.model}</p>
                            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{asset.brand}</p>
                        </td>
                        <td className="px-6 py-4">
                            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{asset.assignedTo || 'Unassigned'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                asset.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                                {asset.status}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
