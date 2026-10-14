import React, { useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { NavItem } from './Sidebar';
export const MobileNav = ({ navItems, activeTab, setActiveTab }: { navItems: NavItem[]; activeTab: string; setActiveTab: (tab: string) => void }) => {
 const [open, setOpen] = useState(false);
 const choose = (id: string) => { setActiveTab(id); setOpen(false); };
 const render = (item: NavItem) => <button key={item.id} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => choose(item.id)} className={`min-w-0 flex-1 flex flex-col items-center gap-1 p-2 text-xs ${activeTab === item.id ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}><item.icon size={22}/><span className="text-center break-words">{item.label}</span></button>;
 return <>
 {open && <div className="fixed inset-0 z-50 lg:hidden bg-black/40" onClick={() => setOpen(false)}><div role="dialog" aria-modal="true" aria-label="Navigation" className="absolute bottom-20 inset-x-0 max-h-[70vh] overflow-auto rounded-t-2xl bg-white dark:bg-slate-900 p-4" onClick={e => e.stopPropagation()}><button aria-label="Close menu" onClick={() => setOpen(false)} className="float-right p-2"><X/></button><div className="grid grid-cols-3 clear-both">{navItems.slice(4).map(render)}</div></div></div>}
 <nav aria-label="Main navigation" className="fixed bottom-0 inset-x-0 min-h-20 pb-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900 border-t flex items-center z-50 lg:hidden">{navItems.slice(0,4).map(render)}{navItems.length > 4 && <button aria-expanded={open} onClick={() => setOpen(!open)} className="flex-1 p-2 flex flex-col items-center text-xs gap-1"><MoreHorizontal size={22}/>More</button>}</nav>
 </>;
};
