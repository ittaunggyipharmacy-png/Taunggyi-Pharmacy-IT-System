import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export function SearchableDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  label, 
  icon: Icon,
  className 
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  label?: string;
  icon?: any;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    (o || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("relative group", className)} ref={dropdownRef}>
      {label && <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{label}</label>}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold transition-all text-slate-700 dark:text-slate-300 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none",
          isOpen ? "ring-2 ring-indigo-500/10 border-indigo-400" : ""
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={12} className="text-slate-400 shrink-0" />}
          <span className="truncate">{value === "All" || !value ? placeholder : value}</span>
        </div>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", isOpen ? "rotate-180" : "rotate-0")} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            className="absolute z-[100] mt-2 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
               <div className="relative">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                 <input 
                   autoFocus
                   type="text" 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500/10 dark:text-white"
                   placeholder="Search options..."
                 />
               </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
              {["All", ...options].length === 0 && <div className="px-4 py-3 text-[10px] text-slate-400 italic text-center">No options available</div>}
              {["All", ...filteredOptions].map((opt, i) => (
                <button
                  key={`${opt}-${i}`}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between",
                    value === opt ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <span>{opt}</span>
                  {value === opt && <CheckCircle2 size={12} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
