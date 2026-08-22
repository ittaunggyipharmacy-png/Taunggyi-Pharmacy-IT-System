import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Sparkles, Filter, Search, ChevronRight, 
  CheckCircle2, Clock, Star, Edit3, X, UserCheck, Plus, User
} from 'lucide-react';
import { EmployeeProfile, SystemSettings } from '../../types';
import { saveEmployeeProfile } from '../../services/userService';
import { saveActivity } from '../../services/kpiService';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

export function SkillsModule({ employees, settings }: { employees: EmployeeProfile[], settings: SystemSettings }) {
 const [isAdding, setIsAdding] = useState(false);
 const [newEmployee, setNewEmployee] = useState<Partial<EmployeeProfile>>({ department: "IT", skills: [] });

 const DEPARTMENTS = ["IT", "Merchandising", "Digital Marketing", "Management"];
 const SKILL_CATEGORIES = [
 "Hardware", "Networking", "Graphic Design", "Video Editing", 
 "Copywriting", "Software", "System Admin", "Data Analysis", "Communication"
 ];

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newEmployee.name || !newEmployee.department) return;
 
 await saveEmployeeProfile(newEmployee);
 setIsAdding(false);
 setNewEmployee({ department: "IT", skills: [] });
 };

 const updateSkill = (category: string, level: number) => {
 const existingSkills = newEmployee.skills || [];
 const filtered = existingSkills.filter(s => s.category !== category);
 setNewEmployee({
 ...newEmployee,
 skills: [...filtered, { category, level }]
 });
 };

 return (
 <div className="space-y-8">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-medium text-slate-800 dark:text-slate-100">Team Skill Matrix</h2>
 <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage employee competencies</p>
 </div>
 <button 
 onClick={() => setIsAdding(true)}
 className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-100"
 >
 <Plus size={16} />
 Add Employee
 </button>
 </div>

 {isAdding && (
 <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
 <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><User size={20} className="text-indigo-600 dark:text-indigo-400" /> New Employee Profile</h3>
 <form onSubmit={handleSave} className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-2">Name</label>
 <input type="text" required value={newEmployee.name || ""} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-slate-300" placeholder="John Doe" />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-2">Department</label>
 <select value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value as any})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
 <option value="">Select Department</option>
 {settings.departments.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-800">{d}</option>)}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-4">Assign Skills</label>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {SKILL_CATEGORIES.map(category => {
 const currLevel = newEmployee.skills?.find(s => s.category === category)?.level || 0;
 return (
 <div key={category} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
 <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{category}</span>
 <div className="flex gap-1 mt-2">
 {[1,2,3,4,5].map(lvl => (
 <button
 key={lvl}
 type="button"
 onClick={() => updateSkill(category, lvl)}
 className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${lvl <= currLevel ? 'bg-amber-400 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
 >
 ★
 </button>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
 <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
 <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium text-xs hover:bg-indigo-500">Save Profile</button>
 </div>
 </form>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {employees.map(emp => (
 <div key={emp.id} className="enterprise-card p-6 flex flex-col h-full">
 <div className="flex justify-between items-start mb-6">
 <div>
 <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{emp.name}</h3>
 <span className="inline-block px-2 py-1 mt-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium text-slate-500 dark:text-slate-400 rounded">{emp.department}</span>
 </div>
 <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium">
 {emp.name.charAt(0)}
 </div>
 </div>

 <div className="flex-1 space-y-4">
 <h4 className="text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">Skill Matrix</h4>
 {emp.skills?.length === 0 ? (
 <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 italic">No skills recorded.</p>
 ) : (
 emp.skills?.sort((a,b) => b.level - a.level).map(skill => (
 <div key={skill.category} className="flex justify-between items-center">
 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{skill.category}</span>
 <div className="flex gap-1">
 {[1,2,3,4,5].map(lvl => (
 <div key={lvl} className={`w-3 h-3 rounded-full ${lvl <= skill.level ? 'bg-amber-400' : 'bg-slate-100 dark:bg-slate-800'}`} />
 ))}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

