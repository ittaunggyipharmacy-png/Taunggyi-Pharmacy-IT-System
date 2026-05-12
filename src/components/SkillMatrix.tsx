import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee } from '../types';
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
  Info
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Khun Thwin Oo', skills: Array.from({ length: 18 }, (_, i) => ({ skillId: i + 1, level: 3 })) },
  { id: '2', name: 'Kaung Sat Woon', skills: Array.from({ length: 18 }, (_, i) => ({ skillId: i + 1, level: 2 })) },
  { id: '3', name: 'Aung Kaung Myat', skills: Array.from({ length: 18 }, (_, i) => ({ skillId: i + 1, level: 2 })) },
];

const LEVEL_CONFIG: { [key: number]: { color: string; label: string; text: string; light: string } } = {
  0: { color: 'bg-slate-100', text: 'text-slate-400', label: 'None', light: 'bg-slate-50' },
  1: { color: 'bg-rose-500', text: 'text-white', label: 'Training', light: 'bg-rose-100' },
  2: { color: 'bg-amber-500', text: 'text-white', label: 'Helper', light: 'bg-amber-100' },
  3: { color: 'bg-emerald-500', text: 'text-white', label: 'Qualified', light: 'bg-emerald-100' },
  4: { color: 'bg-indigo-600', text: 'text-white', label: 'Trainer', light: 'bg-indigo-100' },
};

const SkillMatrix: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(INITIAL_EMPLOYEES[0].id);
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('cards');

  const selectedEmployee = useMemo(() => 
    employees.find(e => e.id === selectedEmployeeId), 
    [employees, selectedEmployeeId]
  );

  const radarData = useMemo(() => {
    if (!selectedEmployee) return [];
    
    // Group by category and take averages for radar
    return Object.entries(SKILL_CATEGORIES).map(([category, skillIds]) => {
      const categoryLevels = skillIds.map(sId => 
        selectedEmployee.skills.find(s => s.skillId === sId)?.level || 0
      );
      const avg = categoryLevels.reduce((a, b) => a + b, 0) / categoryLevels.length;
      return {
        subject: category.split(' & ')[0], // Shorten for radar
        fullSubject: category,
        A: avg,
        fullMark: 4,
      };
    });
  }, [selectedEmployee]);

  const handleLevelChange = (empId: string, skillId: number) => {
    setEmployees(prev => prev.map(emp => emp.id === empId ? {
      ...emp,
      skills: emp.skills.map(s => s.skillId === skillId ? { ...s, level: ((s.level + 1) % 5) as any } : s)
    } : emp));
  };

  const getOverallStats = () => {
    const totalSkills = employees.length * 18;
    const proficientSkills = employees.reduce((acc, emp) => 
      acc + emp.skills.filter(s => s.level >= 2).length, 0
    );
    const masterySkills = employees.reduce((acc, emp) => 
      acc + emp.skills.filter(s => s.level === 4).length, 0
    );
    
    return {
      coverage: Math.round((proficientSkills / totalSkills) * 100),
      mastery: masterySkills
    };
  };

  const stats = getOverallStats();

  return (
    <div className="p-4 sm:p-8 bg-[#FAFBFF] min-h-screen font-sans text-slate-900">
      {/* Dynamic Header */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-1 bg-indigo-600 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Operations Control</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
            Team <span className="text-indigo-600">DNA</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">Visualization of organizational competency & scaling potential.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid size={14} /> Personnel Profiles
          </button>
          <button 
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'matrix' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <ScrollText size={14} /> Global Matrix
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={64} className="text-indigo-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Squad Size</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{employees.length}</span>
            <span className="text-xs font-bold text-slate-400">Nodes</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Target size={64} className="text-emerald-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Skill Coverage</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.coverage}%</span>
            <span className="text-xs font-bold text-emerald-500">+12% vs LY</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Award size={64} className="text-rose-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Masters</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.mastery}</span>
            <span className="text-xs font-bold text-rose-500">Trainers</span>
          </div>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Employee Selection & Visual Profile */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Users size={16} className="text-indigo-600" /> Specialist Roster
              </h3>
              <div className="space-y-2">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all border-2 ${selectedEmployeeId === emp.id ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-transparent hover:bg-slate-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${selectedEmployeeId === emp.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${selectedEmployeeId === emp.id ? 'text-indigo-900' : 'text-slate-700'}`}>{emp.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lead Associate</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm aspect-square min-h-[350px] flex flex-col items-center justify-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-slate-400 self-start">Competency Geometry</h3>
              <ResponsiveContainer width="100%" height="90%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 4]} tick={false} axisLine={false} />
                  <Radar
                    name={selectedEmployee?.name}
                    dataKey="A"
                    stroke="#4F46E5"
                    fill="#4F46E5"
                    fillOpacity={0.2}
                  />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
              <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase italic">Multi-dimensional specialized balance</p>
            </div>
          </div>

          {/* Skill Breakdown */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg">
                    <Target size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Skill Breakdown</h3>
                    <p className="text-[10px] text-slate-400 font-bold">Comprehensive assessment for {selectedEmployee?.name}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {Object.entries(SKILL_CATEGORIES).map(([category, skillIds]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-3 bg-indigo-600 rounded-full" />
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">{category}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {skillIds.map(sId => {
                        const skill = SKILLS.find(s => s.id === sId);
                        const empSkill = selectedEmployee?.skills.find(s => s.skillId === sId);
                        const level = empSkill?.level || 0;
                        const config = LEVEL_CONFIG[level];
                        
                        return (
                          <div 
                            key={sId}
                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${config.light} border-transparent hover:border-indigo-200`}
                            onClick={() => selectedEmployee && handleLevelChange(selectedEmployee.id, sId)}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{skill?.name}</p>
                              <p className="text-[9px] text-slate-400">{skill?.myanmarName}</p>
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase shadow-sm ${config.color} ${config.text}`}>
                              {config.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="sticky left-0 z-20 bg-slate-900 p-8 text-left border-r border-slate-800 min-w-[280px]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg">
                      <ScrollText size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tighter">Competencies</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Taxonomy</p>
                    </div>
                  </div>
                </th>
                {employees.map(emp => (
                  <th key={emp.id} className="p-8 text-center min-w-[180px] border-r border-slate-800 last:border-0 grow">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-black text-indigo-400 border border-slate-700">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                       </div>
                       <span className="text-xs font-black uppercase tracking-tighter text-indigo-400">{emp.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(SKILL_CATEGORIES).map(([category, skillIds]) => (
                <React.Fragment key={category}>
                  <tr className="bg-slate-50/80">
                    <td colSpan={employees.length + 1} className="px-8 py-3 bg-slate-50/50 sticky left-0 z-10 border-r border-slate-100">
                       <span className="text-[10px] font-black text-indigo-600/60 uppercase tracking-[0.2em]">{category}</span>
                    </td>
                  </tr>
                  {skillIds.map(sId => {
                    const skill = SKILLS.find(s => s.id === sId);
                    return (
                      <tr key={sId} className="group hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-6 border-r border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-300">#{sId.toString().padStart(2, '0')}</span>
                            <div>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{skill?.name}</p>
                              <p className="text-[9px] text-slate-400 italic">{skill?.myanmarName}</p>
                            </div>
                          </div>
                        </td>
                        {employees.map(emp => {
                          const empSkill = emp.skills.find(s => s.skillId === sId);
                          const level = empSkill?.level || 0;
                          const config = LEVEL_CONFIG[level];
                          return (
                            <td key={emp.id} className="p-3 text-center border-r border-slate-100 last:border-0">
                               <button 
                                onClick={() => handleLevelChange(emp.id, sId)}
                                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border-2 border-transparent hover:scale-110 hover:shadow-lg ${config.light} ${config.text} mx-auto`}
                               >
                                  <span className="text-xs font-black">{level}</span>
                                  <span className="text-[7px] font-black uppercase opacity-60 tracking-tighter">{config.label}</span>
                               </button>
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

      {/* Legend Footer */}
      <footer className="mt-12 flex flex-wrap gap-4 justify-center">
        {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
          <div key={level} className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
             <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${config.color} ${config.text}`}>
               {level}
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{config.label}</p>
               <p className="text-[9px] text-slate-400 font-medium">Standardized Protocol</p>
             </div>
          </div>
        ))}
      </footer>
    </div>
  );
};

export default SkillMatrix;
