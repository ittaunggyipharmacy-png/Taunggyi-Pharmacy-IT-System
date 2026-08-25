import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, CheckCircle2, User, Building } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

export function SearchableDropdown({
  options = [],
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
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAssignedTo = (label || "").trim().toLowerCase() === "assigned to" ||
    (placeholder || "").trim().toLowerCase().includes("assigned") ||
    (placeholder || "").trim().toLowerCase().includes("mg mg");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAssignedTo) return;

    let cancelled = false;
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const [{ data: appUsers, error: appUsersError }, { data: assetPeople, error: assetPeopleError }] = await Promise.all([
          supabase
            .from("app_users")
            .select("uid, display_name, employee_id, department, branch, position")
            .order("display_name", { ascending: true }),
          supabase
            .from("asset_people")
            .select("id, full_name, employee_id, department, branch, position")
            .order("full_name", { ascending: true }),
        ]);

        if (appUsersError) console.warn("Could not fetch app_users for dropdown:", appUsersError);
        if (assetPeopleError) console.warn("Could not fetch asset_people for dropdown:", assetPeopleError);

        if (cancelled) return;

        const names = new Map<string, string>();
        (appUsers || []).forEach((user: any) => {
          const name = String(user.display_name || "").trim();
          if (name) names.set(name.toLowerCase(), name);
        });
        (assetPeople || []).forEach((person: any) => {
          const name = String(person.full_name || "").trim();
          if (name && !names.has(name.toLowerCase())) {
            names.set(name.toLowerCase(), name);
          }
        });

        setUserOptions(Array.from(names.values()));
      } catch (error) {
        console.error("Failed to load Assigned To users from Supabase", error);
        if (!cancelled) setUserOptions([]);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [isAssignedTo]);

  const dropdownOptions = isAssignedTo
    ? Array.from(new Set([...(value && value !== "Unassigned" ? [value] : []), ...userOptions, ...options]))
    : options;

  const normalizedSearch = search.toLowerCase().trim();
  const filteredOptions = dropdownOptions.filter(o =>
    (o || "").toLowerCase().includes(normalizedSearch)
  );

  return (
    <div className={cn("relative group", className)} ref={dropdownRef}>
      {label && <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ml-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium transition-all text-slate-700 dark:text-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/10 outline-none",
          isOpen ? "ring-2 ring-blue-500/10 border-blue-500" : ""
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon ? <Icon size={13} className="text-slate-400 shrink-0" /> : isAssignedTo ? <User size={13} className="text-blue-500 shrink-0" /> : null}
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
            className="absolute z-[100] mt-2 w-full min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                  placeholder={isAssignedTo ? "Search user name / employee..." : "Search options..."}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
              {usersLoading && isAssignedTo ? (
                <div className="px-4 py-3 text-xs text-slate-400 text-center">Loading users & asset people...</div>
              ) : (
                <>
                  {search.trim() && !filteredOptions.some(o => o.toLowerCase() === search.trim().toLowerCase()) && isAssignedTo && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange(search.trim());
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800"
                    >
                      <span>+ Use "{search.trim()}"</span>
                    </button>
                  )}
                  {filteredOptions.length === 0 && !search.trim() ? (
                    <div className="px-4 py-3 text-xs text-slate-400 italic text-center">No options available</div>
                  ) : (
                    (isAssignedTo
                      ? ["Unassigned", ...filteredOptions.filter(o => o !== "Unassigned" && o !== "All")]
                      : ["All", ...filteredOptions.filter(o => o !== "All")]
                    ).map((opt, i) => (
                      <button
                        key={`${opt}-${i}`}
                        type="button"
                        onClick={() => {
                          onChange(opt === "All" ? "" : opt);
                          setIsOpen(false);
                          setSearch("");
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between",
                          value === opt || (!value && (opt === "All" || opt === "Unassigned"))
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}
                      >
                        <span className="truncate">{opt}</span>
                        {(value === opt || (!value && (opt === "All" || opt === "Unassigned"))) && <CheckCircle2 size={13} className="shrink-0" />}
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
