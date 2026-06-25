import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MultiSelectDropdownProps {
 label: string;
 placeholder: string;
 options: string[];
 selected: string[];
 onChange: (selected: string[]) => void;
 icon?: React.ElementType;
 className?: string;
}

export function MultiSelectDropdown({ 
 label, 
 placeholder, 
 options, 
 selected, 
 onChange, 
 icon: Icon,
 className 
}: MultiSelectDropdownProps) {
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

 const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

 const toggleOption = (option: string) => {
 if (selected.includes(option)) {
 onChange(selected.filter(s => s !== option));
 } else {
 onChange([...selected, option]);
 }
 };

 const toggleAll = () => {
 if (selected.length === options.length) {
 onChange([]);
 } else {
 onChange(options);
 }
 };

 return (
 <div className={cn("relative", className)} ref={dropdownRef}>
 <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">{label}</label>
 <button 
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 className={cn(
 "w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium transition-all text-slate-700 dark:text-slate-200 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none",
 isOpen ? "ring-2 ring-indigo-500/10 border-indigo-400" : ""
 )}
 >
 <div className="flex items-center overflow-hidden">
 {Icon && <Icon size={14} className="text-slate-400 mr-2 shrink-0" />}
 <span className="truncate">
 {selected.length === 0 ? placeholder : `${selected.length} Selected`}
 </span>
 </div>
 <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0 ml-2", isOpen ? "rotate-180" : "rotate-0")} />
 </button>

 <AnimatePresence>
 {isOpen && (
 <motion.div 
 initial={{ opacity: 0, y: 5, scale: 0.98 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 5, scale: 0.98 }}
 className="absolute z-[100] mt-2 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
 >
 <div className="p-2 border-b border-slate-100">
 <div className="relative">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
 <input 
 type="text" 
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500/10"
 placeholder="Search..."
 />
 </div>
 </div>
 
 <div className="px-2 py-1 border-b border-slate-100">
 <button 
 onClick={toggleAll}
 className="w-full text-left px-2 py-1.5 text-xs text-indigo-600 font-medium hover:bg-slate-50 rounded"
 >
 {selected.length === options.length ? "Deselect All" : "Select All"}
 </button>
 </div>

 <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
 {filteredOptions.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 italic text-center">No options</div>}
 {filteredOptions.map((opt) => (
 <button
 key={opt}
 type="button"
 onClick={() => toggleOption(opt)}
 className={cn(
 "w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2",
 selected.includes(opt) ? "bg-indigo-50 text-slate-900 dark:text-white font-medium" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50"
 )}
 >
 <div className={cn("w-4 h-4 rounded border flex items-center justify-center", selected.includes(opt) ? "bg-indigo-600 border-indigo-600" : "border-slate-300")}>
 {selected.includes(opt) && <Check size={10} className="text-white" />}
 </div>
 <span>{opt}</span>
 </button>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
