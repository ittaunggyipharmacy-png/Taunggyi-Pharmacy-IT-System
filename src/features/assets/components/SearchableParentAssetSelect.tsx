import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Laptop, User, MapPin, Building, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ITAsset } from '../types';

interface SearchableParentAssetSelectProps {
  assets: ITAsset[];
  currentAssetId?: string;
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableParentAssetSelect({
  assets,
  currentAssetId,
  value,
  onChange,
  placeholder = "Search computer by code, model, brand, or assignee...",
  disabled = false
}: SearchableParentAssetSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter available computer parent hosts (exclude the asset itself and purged/disposed assets)
  const computerAssets = useMemo(() => {
    return assets.filter(a => 
      a.category === "Computer" && 
      a.id !== currentAssetId && 
      !a.isPurged && 
      a.status !== "Disposed"
    );
  }, [assets, currentAssetId]);

  // Find currently selected parent
  const selectedParent = useMemo(() => {
    if (!value) return null;
    return assets.find(a => a.id === value || a.asset_code === value);
  }, [assets, value]);

  // Filtered list based on search term
  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return computerAssets;

    return computerAssets.filter(comp => {
      const code = (comp.asset_code || comp.id || "").toLowerCase();
      const model = (comp.model || "").toLowerCase();
      const brand = (comp.brand || "").toLowerCase();
      const name = (comp.name || "").toLowerCase();
      const assignee = (comp.assignedTo || "").toLowerCase();
      const dept = (comp.department || "").toLowerCase();
      const location = (comp.location || comp.branch || "").toLowerCase();
      const serial = (comp.serialNumber || "").toLowerCase();

      return (
        code.includes(term) ||
        model.includes(term) ||
        brand.includes(term) ||
        name.includes(term) ||
        assignee.includes(term) ||
        dept.includes(term) ||
        location.includes(term) ||
        serial.includes(term)
      );
    });
  }, [computerAssets, search]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const handleSelect = (assetId: string | undefined) => {
    onChange(assetId);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
          isOpen
            ? "border-[#2563EB] ring-2 ring-blue-500/20 shadow-sm"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800" : ""}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            selectedParent 
              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
          }`}>
            {selectedParent ? <Laptop size={16} /> : <Ban size={15} />}
          </div>

          <div className="min-w-0 flex-1">
            {selectedParent ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                  {selectedParent.brand ? `${selectedParent.brand} ` : ''}{selectedParent.model}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {selectedParent.asset_code || selectedParent.id}
                  </span>
                  {selectedParent.assignedTo && selectedParent.assignedTo !== "Unassigned" && (
                    <span className="text-slate-400 hidden md:inline truncate">
                      • {selectedParent.assignedTo}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                None (Standalone / Host Node)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedParent && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleSelect(undefined);
                }
              }}
              title="Reset to Standalone"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden flex flex-col max-h-[380px]"
          >
            {/* Search Box Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-normal"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400 font-medium">
                <span>Search by Model, Code, Brand, Assignee</span>
                <span>{filteredAssets.length} Computers</span>
              </div>
            </div>

            {/* Options List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100/80 dark:divide-slate-800/80 p-1.5">
              {/* Option: None (Standalone) */}
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                  !value 
                    ? "bg-blue-50/80 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium" 
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    <Ban size={15} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">None (Standalone / Host Node)</div>
                    <div className="text-xs text-slate-400">Direct independent asset without parent workstation</div>
                  </div>
                </div>
                {!value && <Check size={16} className="text-[#2563EB] shrink-0" />}
              </button>

              {/* Computer Asset Items */}
              {filteredAssets.map((comp) => {
                const isSelected = selectedParent?.id === comp.id || value === comp.id;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => handleSelect(comp.id)}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30" 
                          : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                      }`}>
                        <Laptop size={15} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded border border-slate-200/50 dark:border-slate-700">
                            {comp.asset_code || comp.id}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {comp.brand ? `${comp.brand} ` : ''}{comp.model}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                          {comp.assignedTo && comp.assignedTo !== "Unassigned" && (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <User size={11} className="text-slate-400" />
                              <span className="truncate max-w-[120px]">{comp.assignedTo}</span>
                            </span>
                          )}
                          {comp.department && (
                            <span className="flex items-center gap-1 text-slate-400 hidden sm:flex">
                              <Building size={11} />
                              <span>{comp.department}</span>
                            </span>
                          )}
                          {comp.location && (
                            <span className="flex items-center gap-1 text-slate-400 hidden sm:flex">
                              <MapPin size={11} />
                              <span>{comp.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 ml-2 shadow-sm">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredAssets.length === 0 && (
                <div className="py-8 px-4 text-center">
                  <Laptop size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2 opacity-70" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No matching computer found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    "{search}" နှင့် ကိုက်ညီသော Computer Asset မတွေ့ရှိပါ။
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
