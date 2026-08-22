import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 cursor-pointer flex justify-between items-center"
      >
        <span className={cn(!value && "text-slate-400")}>
          {value ? options.find((o) => o.id === value)?.label || value : placeholder}
        </span>
        <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={12}
              />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search computer..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-2 text-xs text-slate-400 text-center font-medium">
                No computers found
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    onChange(o.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors flex flex-col",
                    value === o.id && "bg-indigo-50 text-indigo-600"
                  )}
                >
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs opacity-60">{o.id}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
