import React from "react";
import { HardDrive, Plus, Filter } from "lucide-react";

export function AssetEmptyState({ 
  type, 
  onAddAsset, 
  onClearFilters 
}: { 
  type: "no-assets" | "no-results", 
  onAddAsset?: () => void,
  onClearFilters?: () => void
}) {
  if (type === "no-assets") {
    return (
      <div className="p-16 text-center">
        <div className="w-12 h-12 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HardDrive size={24} />
        </div>
        <h3 className="text-base font-semibold text-[#0F172A] mb-1">No assets found</h3>
        <p className="text-sm text-[#64748B] mb-6 max-w-sm mx-auto">
          Start managing your company&apos;s IT equipment by adding your first asset.
        </p>
        <button
          onClick={onAddAsset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-xl transition-all text-sm shadow-sm shadow-blue-500/20"
        >
          <Plus size={16} />
          <span>+ Add Asset</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-16 text-center">
      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Filter size={24} />
      </div>
      <h3 className="text-base font-semibold text-[#0F172A] mb-1">No assets match your filters</h3>
      <p className="text-sm text-[#64748B] mb-6 max-w-sm mx-auto">
        Try adjusting your search criteria or filters to view matching assets.
      </p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-medium rounded-xl transition-all text-sm shadow-sm"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
