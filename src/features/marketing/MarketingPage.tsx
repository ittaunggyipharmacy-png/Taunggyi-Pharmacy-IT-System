import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, Plus, Trash2, Edit3, CheckCircle2, 
  Clock, AlertCircle, Sparkles, Filter, Search, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ContentPlan } from '../../types';
import { saveContentPlan, deleteContentPlan } from '../../services/marketingService';
import { saveActivity } from '../../services/kpiService';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { cn } from '../../lib/utils';

export function MarketingModule({ plans, setPlans, isAdmin }: { plans: ContentPlan[], setPlans: (p: ContentPlan[]) => void, isAdmin: boolean }) {
 const [isAddingPlan, setIsAddingPlan] = useState(false);

 return (
 <div className="space-y-6 lg:space-y-8 pb-20 lg:pb-0">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 enterprise-card p-6 lg:p-10">
 <div className="max-w-md">
 <h2 className="text-xl lg:text-2xl font-medium text-slate-800 dark:text-slate-100 tracking-tight ">Strategy & Ops Pipeline</h2>
 <p className="text-xs lg:text-xs text-slate-400 mt-2 lg:mt-3 leading-relaxed font-medium">
 Verify: Product • Price • Promo Period • Contact ID
 </p>
 </div>
 <div className="w-full sm:w-auto p-4 lg:p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between sm:justify-start gap-4 lg:gap-5">
 <div className="flex items-center gap-3 lg:gap-5">
 <div className="w-10 h-10 lg:w-14 lg:h-14 bg-indigo-600 text-white rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
 <Megaphone size={20} className="lg:w-7 lg:h-7" />
 </div>
 <div>
 <p className="text-xs lg:text-xs font-medium text-slate-400 ">Active nodes</p>
 <p className="text-xl lg:text-2xl font-medium text-slate-800 dark:text-slate-100">{plans.filter(p => p.status === "Draft").length}</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 {isAdmin && (
 <>
 <button 
 onClick={() => setIsAddingPlan(true)}
 className="hidden lg:flex items-center gap-2 py-2 px-4 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-cyan-600 hover:text-white transition-all"
 >
 <Plus size={16} /> Add Strategy
 </button>
 <button 
 onClick={() => setIsAddingPlan(true)}
 className="p-2 bg-white dark:bg-slate-900/5 hover:bg-white dark:bg-slate-900/10 rounded-lg text-cyan-400 lg:hidden"
 >
 <Plus size={24} />
 </button>
 </>
 )}
 </div>
 </div>
 </div>

 <AnimatePresence>
 {isAddingPlan && (
 <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
 <motion.div 
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 20, opacity: 0 }}
 className="glass-panel p-6 sm:p-8 w-full h-full sm:h-auto sm:max-w-md shadow-2xl rounded-none sm:rounded-3xl overflow-y-auto"
 >
 <h3 className="text-xl font-medium text-white mb-8 tracking-tight flex items-center gap-2">
 <Megaphone size={20} className="text-cyan-400" />
 New Content Blueprint
 </h3>
 <div className="space-y-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Platform</label>
 <select className="w-full px-4 py-3.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none">
 <option>Facebook</option>
 <option>Viber</option>
 <option>TikTok</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Product / Topic</label>
 <input 
 type="text" 
 placeholder="Campaign title..." 
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Promotion Details</label>
 <textarea 
 rows={3}
 placeholder="Price, duration, special offers..." 
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10 resize-none"
 />
 </div>
 </div>
 <div className="flex flex-col sm:flex-row gap-3 mt-10">
 <button 
 onClick={() => setIsAddingPlan(false)}
 className="w-full py-4 sm:py-3 px-4 bg-white dark:bg-slate-900/5 text-slate-400 rounded-xl font-medium text-xs hover:bg-white dark:bg-slate-900/10 transition-colors order-2 sm:order-1"
 >
 Cancel
 </button>
 <button 
 onClick={() => setIsAddingPlan(false)}
 className="w-full py-4 sm:py-3 px-4 bg-cyan-600 text-white rounded-xl font-medium text-xs hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/40 order-1 sm:order-2"
 >
 Initialize Strategy
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
 {plans.map(plan => (
 <div key={plan.id} className="glass-card p-6 lg:p-8 group hover:border-cyan-500/40 transition-all duration-300">
 <div className="flex justify-between items-center mb-6 lg:mb-8">
 <span className={cn(
 "px-2.5 py-0.5 lg:px-3 lg:py-1 rounded border text-xs lg:text-xs font-medium text-slate-500 dark:text-slate-400",
 plan.platform === "Facebook" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
 plan.platform === "Viber" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-white dark:bg-slate-900/5 text-slate-400 border-white/10"
 )}>
 {plan.platform}
 </span>
 <span className="text-xs lg:text-xs font-medium text-amber-400  flex items-center gap-2 tracking-widest">
 <Clock size={12} className="animate-pulse" /> {plan.status}
 </span>
 </div>
 
 <h4 className="text-lg lg:text-xl font-medium text-white tracking-tight group-hover:text-cyan-400 transition-colors ">{plan.productName}</h4>
 <div className="mt-6 lg:mt-8 space-y-3 lg:space-y-4">
 <div className="flex items-center gap-4 p-3 lg:p-4 bg-white dark:bg-slate-900/5 rounded-2xl border border-white/5">
 <span className="text-xs lg:text-xs font-medium text-slate-500 dark:text-slate-400 w-16 lg:w-20 shrink-0">Price Unit</span>
 <span className="text-xs lg:text-sm font-semibold text-slate-200">{plan.price}</span>
 </div>
 <div className="flex items-center gap-4 p-3 lg:p-4 bg-white dark:bg-slate-900/5 rounded-2xl border border-white/5">
 <span className="text-xs lg:text-xs font-medium text-slate-500 dark:text-slate-400 w-16 lg:w-20 shrink-0">Duration</span>
 <span className="text-xs lg:text-sm font-semibold text-slate-200">{plan.promotionPeriod}</span>
 </div>
 </div>

 {isAdmin && (
 <div className="mt-8 lg:mt-10 flex flex-col sm:flex-row gap-3 lg:gap-4">
 <button className="flex-1 py-4 sm:py-3.5 px-6 bg-cyan-600 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/40">
 Commit & Dispatch
 </button>
 <button className="flex-1 py-4 sm:py-3.5 px-6 bg-white dark:bg-slate-900/5 text-slate-400 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900/10 transition-colors">
 Modify
 </button>
 </div>
 )}
 </div>
 ))}
 {isAdmin && (
 <button 
 onClick={() => setIsAddingPlan(true)}
 className="border-2 border-dashed border-white/10 rounded-[2rem] lg:rounded-[2.5rem] p-8 lg:p-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all group bg-white dark:bg-slate-900/5 backdrop-blur-sm shadow-xl"
 >
 <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900/5 group-hover:bg-cyan-500/10 border border-white/5 transition-all mb-4 lg:mb-6">
 <Plus size={24} className="lg:w-7 lg:h-7" />
 </div>
 <p className="font-medium text-xs lg:text-sm tracking-tight ">New Content Blueprint</p>
 <p className="text-xs lg:text-xs  font-medium mt-2 opacity-40 tracking-widest">SOP-001 Protocol</p>
 </button>
 )}
 </div>
 </div>
 );
}

