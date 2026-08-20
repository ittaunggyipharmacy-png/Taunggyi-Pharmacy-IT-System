import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, EmployeeSkillLevel } from '../types';
import { SKILLS, SKILL_CATEGORIES } from '../constants';
import { 
 Users, 
 Target, 
 TrendingUp,
 Award,
 BookOpen,
 LayoutGrid,
 ScrollText,
 ChevronDown,
 Star,
 Info,
 Zap,
 Layers,
 Search,
 Filter,
 ArrowRight
} from 'lucide-react';
import {
 Radar,
 RadarChart,
 PolarGrid,
 PolarAngleAxis,
 PolarRadiusAxis,
 ResponsiveContainer,
 Tooltip as RechartsTooltip,
 Area,
 AreaChart,
 XAxis,
 YAxis,
 CartesianGrid
} from 'recharts';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const LEVEL_CONFIG: { [key: number]: { color: string; label: string; text: string; light: string; border: string; glow: string } } = {
 0: { color: 'bg-slate-100', text: 'text-slate-400', label: 'None', light: 'bg-slate-50', border: 'border-slate-100', glow: 'shadow-none' },
 1: { color: 'bg-rose-500', text: 'text-white', label: 'Learner', light: 'bg-rose-50', border: 'border-rose-100', glow: 'shadow-rose-100' },
 2: { color: 'bg-amber-500', text: 'text-white', label: 'Practitioner', light: 'bg-amber-50', border: 'border-amber-100', glow: 'shadow-amber-100' },
 3: { color: 'bg-emerald-500', text: 'text-white', label: 'Specialist', light: 'bg-emerald-50', border: 'border-emerald-100', glow: 'shadow-emerald-100' },
 4: { color: 'bg-indigo-600', text: 'text-white', label: 'Mentor', light: 'bg-indigo-50', border: 'border-indigo-100', glow: 'shadow-indigo-100' },
};

export const SkillMatrix: React.FC<{ employees?: any[]; settings?: any }> = () => {
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
 const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('cards');
 const [searchTerm, setSearchTerm] = useState('');
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const unsub = onSnapshot(collection(db, 'employees'), (snapshot) => {
 const data = snapshot.docs.map(doc => doc.data() as Employee);
 setEmployees(data);
 if (data.length > 0 && !selectedEmployeeId) {
 setSelectedEmployeeId(data[0].id);
 }
 setLoading(false);
 });
 return () => unsub();
 }, []);

 const filteredEmployees = useMemo(() => {
 return employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
 }, [employees, searchTerm]);

 const selectedEmployee = useMemo(() => 
 employees.find(e => e.id === selectedEmployeeId), 
 [employees, selectedEmployeeId]
 );

 const radarData = useMemo(() => {
 if (!selectedEmployee) return [];
 
 return Object.entries(SKILL_CATEGORIES).map(([category, skillIds]) => {
 const categoryLevels = skillIds.map(sId => 
 selectedEmployee.skills.find(s => s.skillId === sId)?.level || 0
 );
 const avg = categoryLevels.reduce((a, b) => a + b, 0) / categoryLevels.length;
 return {
 subject: category.split(' & ')[0],
 fullSubject: category,
 A: avg,
 fullMark: 4,
 };
 });
 }, [selectedEmployee]);

 const handleLevelChange = async (empId: string, skillId: number) => {
 const emp = employees.find(e => e.id === empId);
 if (!emp) return;

 const currentSkill = emp.skills.find(s => s.skillId === skillId);
 const newLevel = (((currentSkill?.level || 0) + 1) % 5) as any;

 const newSkills = [...emp.skills];
 const skillIndex = newSkills.findIndex(s => s.skillId === skillId);
 
 if (skillIndex > -1) {
 newSkills[skillIndex] = { ...newSkills[skillIndex], level: newLevel };
 } else {
 newSkills.push({ skillId, level: newLevel });
 }

 try {
 await setDoc(doc(db, 'employees', empId), {
 ...emp,
 skills: newSkills,
 updatedAt: serverTimestamp()
 }, { merge: true });
 } catch (error) {
 console.error("Failed to update skill", error);
 }
 };

 const stats = useMemo(() => {
 if (employees.length === 0) return { coverage: 0, mastery: 0, totalSkills: 0 };
 const totalSkillsPossible = employees.length * SKILLS.length;
 const proficientSkills = employees.reduce((acc, emp) => 
 acc + (emp.skills?.filter(s => s.level >= 2).length || 0), 0
 );
 const masterySkills = employees.reduce((acc, emp) => 
 acc + (emp.skills?.filter(s => s.level === 4).length || 0), 0
 );
 
 return {
 coverage: Math.round((proficientSkills / totalSkillsPossible) * 100),
 mastery: masterySkills,
 totalSkills: proficientSkills
 };
 }, [employees]);

 if (loading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
 <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
 <p className="text-slate-400 font-medium text-slate-500 dark:text-slate-400 text-xs">Synchronizing Neural Network...</p>
 </div>
 );
 }

 return (
 <div className="space-y-8 pb-20">
 {/* Visual Header */}
 <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
 <Zap size={20} className="text-white" />
 </div>
 <span className="text-xs font-medium  text-indigo-600">Personnel Architecture</span>
 </div>
 <h1 className="text-4xl font-medium text-slate-900 dark:text-white tracking-tighter  leading-none">
 Team <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">Competency</span> Index
 </h1>
 <p className="text-sm font-medium text-slate-400 max-w-xl italic">
 Advanced visualization of organizational skill density and departmental scaling potential for Taunggyi Pharmacy.
 </p>
 </div>

 <div className="flex items-center gap-3 bg-white dark:bg-slate-900/50 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800/60 backdrop-blur-xl shadow-sm">
 <button 
 onClick={() => setViewMode('cards')}
 className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-medium transition-all ${viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-400 hover:text-indigo-600'}`}
 >
 <LayoutGrid size={16} /> Individual Radar
 </button>
 <button 
 onClick={() => setViewMode('matrix')}
 className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-medium transition-all ${viewMode === 'matrix' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-400 hover:text-indigo-600'}`}
 >
 <Layers size={16} /> Enterprise Matrix
 </button>
 </div>
 </header>

 {/* KPI Dashboard - Mini */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 {[
 { label: "Active Nodes", val: employees.length, icon: Users, color: "indigo" },
 { label: "Skill Density", val: `${stats.coverage}%`, icon: Target, color: "emerald" },
 { label: "Master Class", val: stats.mastery, icon: Award, color: "rose" },
 { label: "Capabilities", val: stats.totalSkills, icon: Zap, color: "amber" }
 ].map((stat, i) => (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.1 }}
 key={stat.label}
 className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden"
 >
 <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
 <stat.icon size={80} />
 </div>
 <p className="text-xs font-medium text-slate-400 mb-1">{stat.label}</p>
 <div className="flex items-end gap-2">
 <span className="text-3xl font-medium text-slate-900 dark:text-white tracking-tighter">{stat.val}</span>
 <div className={`w-1.5 h-1.5 rounded-full bg-${stat.color}-500 mb-2 animate-pulse`} />
 </div>
 </motion.div>
 ))}
 </div>

 {viewMode === 'cards' ? (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* Sidebar: Specialist Directory */}
 <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-24">
 <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
 <div className="relative">
 <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
 <input 
 type="text"
 placeholder="Search specialists..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl text-xs font-medium outline-none border border-transparent focus:border-indigo-200 focus:bg-white dark:bg-slate-900 transition-all"
 />
 </div>

 <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
 {filteredEmployees.map(emp => (
 <button
 key={emp.id}
 onClick={() => setSelectedEmployeeId(emp.id)}
 className={`w-full text-left p-4 rounded-3xl flex items-center gap-4 transition-all border-2 relative group overflow-hidden ${selectedEmployeeId === emp.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent bg-slate-50/50 hover:bg-white dark:bg-slate-900 hover:border-slate-200 dark:border-slate-800'}`}
 >
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-medium text-xs transition-transform group-hover:scale-110 ${selectedEmployeeId === emp.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 font-sans' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 shadow-sm'}`}>
 {emp.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div className="flex-1">
 <p className={`text-sm font-medium tracking-tight ${selectedEmployeeId === emp.id ? 'text-indigo-950' : 'text-slate-700 dark:text-slate-200'}`}>{emp.name}</p>
 <div className="flex items-center gap-1.5 mt-1">
 <div className={`w-1.5 h-1.5 rounded-full ${selectedEmployeeId === emp.id ? 'bg-indigo-500' : 'bg-slate-300'}`} />
 <p className="text-xs text-slate-400 font-medium">Lead Associate</p>
 </div>
 </div>
 {selectedEmployeeId === emp.id && <ArrowRight size={14} className="text-indigo-400" />}
 </button>
 ))}
 </div>
 </div>

 <div className="hidden lg:block bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12 group-hover:rotate-45 transition-transform duration-700">
 <TrendingUp size={120} />
 </div>
 <h4 className="text-lg font-medium  mb-2">Performance Data</h4>
 <p className="text-indigo-100 text-xs  font-medium tracking-widest leading-relaxed mb-6">Aggregate skill growth over last quarter</p>
 <div className="h-24">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={radarData}>
 <Area type="monotone" dataKey="A" stroke="#fff" fill="rgba(255,255,255,0.1)" strokeWidth={3} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 {/* Main Content: Deep Dive */}
 <div className="lg:col-span-9 space-y-8">
 <AnimatePresence mode="wait">
 {selectedEmployee ? (
 <motion.div
 key={selectedEmployee.id}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="space-y-8"
 >
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
 {/* Radar Chart Section */}
 <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[450px]">
 <div className="self-start mb-6">
 <h3 className="text-lg font-medium text-slate-900 dark:text-white ">Geometric <span className="text-indigo-600">Profile</span></h3>
 <p className="text-xs font-medium text-slate-400 ">Multi-dimensional capability mapping</p>
 </div>
 <div className="w-full h-[320px]">
 <ResponsiveContainer width="100%" height="100%">
 <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
 <PolarGrid stroke="#f1f5f9" />
 <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 800 }} />
 <PolarRadiusAxis angle={30} domain={[0, 4]} tick={false} axisLine={false} />
 <Radar
 name={selectedEmployee?.name}
 dataKey="A"
 stroke="#4F46E5"
 fill="#4F46E5"
 fillOpacity={0.15}
 strokeWidth={3}
 />
 <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }} />
 </RadarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Quick Stats & Bio */}
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-indigo-50/50 p-8 rounded-[3rem] border border-indigo-100 flex flex-col justify-between">
 <TrendingUp size={32} className="text-indigo-600 mb-4" />
 <div>
 <p className="text-xs font-medium text-indigo-400 mb-1">Expertise Score</p>
 <h4 className="text-4xl font-medium text-indigo-950 tracking-tighter">84.2</h4>
 <p className="text-xs text-indigo-400 font-medium mt-2 flex items-center gap-1">
 <Zap size={10} /> Top 5% of Team
 </p>
 </div>
 </div>
 <div className="bg-emerald-50/50 p-8 rounded-[3rem] border border-emerald-100 flex flex-col justify-between">
 <Star size={32} className="text-emerald-600 mb-4" />
 <div>
 <p className="text-xs font-medium text-emerald-400 mb-1">Primary Role</p>
 <h4 className="text-2xl font-medium text-emerald-950 tracking-tighter leading-none">Senior Associate</h4>
 <p className="text-xs text-emerald-400 font-medium mt-2">IT INFRASTRUCTURE</p>
 </div>
 </div>
 <div className="col-span-2 bg-slate-900 p-10 rounded-[3.5rem] relative overflow-hidden group shadow-2xl shadow-indigo-100/50">
 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000" />
 <div className="relative z-10 space-y-6">
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900/10 backdrop-blur-md flex items-center justify-center font-medium text-xl text-white border border-white/10">
 {selectedEmployee.name.charAt(0)}
 </div>
 <div>
 <h3 className="text-2xl font-medium text-white tracking-tighter ">{selectedEmployee.name}</h3>
 <p className="text-xs text-indigo-400 font-medium ">Operational Specialist ID: PN-{selectedEmployee.id.padStart(4, '0')}</p>
 </div>
 </div>
 <div className="flex gap-4">
 <button className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-3 rounded-full text-xs font-medium hover:scale-105 transition-transform flex items-center gap-2">
 <Users size={12} /> View Records
 </button>
 <button className="bg-white dark:bg-slate-900/10 text-white px-6 py-3 rounded-full text-xs font-medium hover:bg-white dark:bg-slate-900/20 transition-all border border-white/10">
 Generate PDF
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Taxonomy breakdown */}
 <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-12">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-medium text-slate-900 dark:text-white ">Skill <span className="text-indigo-600">Granularity</span></h3>
 <p className="text-xs font-medium text-slate-400 ">Interactive assessment - Click to adjust levels</p>
 </div>
 <div className="hidden sm:flex gap-2">
 {Object.values(LEVEL_CONFIG).map((cfg, idx) => (
 <div key={idx} className={`w-3 h-3 rounded-md ${cfg.color}`} title={cfg.label} />
 ))}
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-16">
 {Object.entries(SKILL_CATEGORIES).map(([category, skillIds]) => (
 <div key={category} className="space-y-6">
 <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-50">
 <div className="w-3 h-3 bg-indigo-600 rounded-full" />
 <h4 className="text-xs font-medium text-slate-400">{category}</h4>
 <span className="ml-auto text-xs font-medium text-slate-300 ">{skillIds.length} Core Elements</span>
 </div>
 <div className="space-y-4">
 {skillIds.map(sId => {
 const skill = SKILLS.find(s => s.id === sId);
 const empSkill = selectedEmployee?.skills.find(s => s.skillId === sId);
 const level = empSkill?.level || 0;
 const config = LEVEL_CONFIG[level];
 
 return (
 <motion.div 
 whileHover={{ x: 8 }}
 key={sId}
 className={`relative p-5 rounded-[2rem] border transition-all flex items-center justify-between group cursor-pointer ${config.light} ${config.border} hover:shadow-xl ${config.glow}`}
 onClick={() => handleLevelChange(selectedEmployee.id, sId)}
 >
 <div className="flex-1">
 <p className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight leading-none mb-1">{skill?.name}</p>
 <p className="text-xs text-slate-400 font-medium font-myanmar leading-none">{skill?.myanmarName}</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex gap-0.5">
 {[1,2,3,4].map(idx => (
 <div key={idx} className={`w-1.5 h-6 rounded-full transition-all duration-500 ${idx <= level ? config.color : 'bg-slate-200/50'}`} />
 ))}
 </div>
 <div className={`min-w-[100px] text-center px-4 py-2 rounded-2xl font-medium text-xs  shadow-sm ${config.color} ${config.text} tracking-widest`}>
 {config.label}
 </div>
 </div>
 </motion.div>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 </div>
 </motion.div>
 ) : (
 <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-[3rem]">
 <Users size={64} className="text-slate-100 mb-4" />
 <h3 className="text-xl font-medium text-slate-300 ">No Node Selected</h3>
 </div>
 )}
 </AnimatePresence>
 </div>
 </div>
 ) : (
 <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-100/20 overflow-x-auto relative">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-slate-900 text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="sticky left-0 z-30 bg-slate-900 p-10 text-left border-r border-slate-800 min-w-[320px]">
 <div className="flex items-center gap-6">
 <div className="p-4 bg-indigo-500 rounded-3xl shadow-xl shadow-indigo-500/20">
 <ScrollText size={24} className="text-white" />
 </div>
 <div>
 <h3 className="text-xl font-medium  leading-none mb-1">Skill Map</h3>
 <p className="text-xs text-slate-400 font-medium  opacity-60">Consolidated Registry</p>
 </div>
 </div>
 </th>
 {employees.map(emp => (
 <th key={emp.id} className="p-10 text-center min-w-[200px] border-r border-slate-800 last:border-0">
 <div className="flex flex-col items-center gap-3 group">
 <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center font-medium text-indigo-100 border border-indigo-400/30 group-hover:scale-110 transition-transform">
 {emp.name.split(' ').map(n => n[0]).join('')}
 </div>
 <span className="text-xs font-medium  text-indigo-300 group-hover:text-white transition-colors">{emp.name}</span>
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {Object.entries(SKILL_CATEGORIES).map(([category, skillIds]) => (
 <React.Fragment key={category}>
 <tr className="bg-slate-50/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <td colSpan={employees.length + 1} className="px-10 py-5 bg-slate-50/50 sticky left-0 z-20 border-r border-slate-100">
 <div className="flex items-center gap-3">
 <div className="w-1 h-3 bg-indigo-600 rounded-full" />
 <span className="text-xs font-medium text-indigo-700 ">{category}</span>
 </div>
 </td>
 </tr>
 {skillIds.map(sId => {
 const skill = SKILLS.find(s => s.id === sId);
 return (
 <tr key={sId} className="group hover:bg-slate-50/50 transition-colors">
 <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 p-8 border-r border-slate-100 shadow-[10px_0_15px_-10px_rgba(0,0,0,0.05)]">
 <div className="flex items-center gap-4">
 <span className="text-xs font-medium text-slate-200">#{sId.toString().padStart(2, '0')}</span>
 <div>
 <p className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight mb-1">{skill?.name}</p>
 <p className="text-xs text-slate-400 font-medium font-myanmar leading-none">{skill?.myanmarName}</p>
 </div>
 </div>
 </td>
 {employees.map(emp => {
 const empSkill = emp.skills?.find(s => s.skillId === sId);
 const level = empSkill?.level || 0;
 const config = LEVEL_CONFIG[level];
 return (
 <td key={emp.id} className="p-4 text-center border-r border-slate-100 last:border-0">
 <motion.button 
 whileTap={{ scale: 0.9 }}
 onClick={() => handleLevelChange(emp.id, sId)}
 className={`w-14 h-14 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 border-2 border-transparent hover:border-indigo-400 hover:shadow-2xl ${config.light} ${config.text} mx-auto relative group/btn ${config.glow}`}
 >
 <span className="text-xs font-medium leading-none">{level}</span>
 <span className="text-xs font-medium opacity-60 tracking-widest mt-1">{config.label}</span>
 <div className="absolute top-0 right-0 p-1 opacity-0 group-hover/btn:opacity-100">
 <ChevronDown size={8} />
 </div>
 </motion.button>
 </td>
 );
 })}
 </tr>
 );
 })}
 </React.Fragment>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* Modern Legend */}
 <div className="flex flex-wrap gap-4 justify-center pt-10">
 {Object.entries(LEVEL_CONFIG).map(([lvl, config]) => (
 <div key={lvl} className="flex items-center gap-4 bg-white dark:bg-slate-900/60 px-4 py-3.5 rounded-[2rem] border border-slate-200 dark:border-slate-800/60 backdrop-blur-md shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-medium text-sm ${config.color} ${config.text} shadow-lg ${config.glow}`}>
 {lvl}
 </div>
 <div className="space-y-0.5">
 <p className="text-xs font-medium text-slate-950 ">{config.label}</p>
 <div className="flex gap-0.5">
 {[1,2,3,4].map(i => (
 <div key={i} className={`w-1.5 h-1 rounded-full ${i <= Number(lvl) ? config.color : 'bg-slate-100'}`} />
 ))}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};

export default SkillMatrix;
