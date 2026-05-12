import React, { useState } from 'react';
import { Employee, Skill } from '../types';
import { SKILLS, SKILL_CATEGORIES } from '../constants';

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Khun Thwin Oo', skills: Array.from({ length: 18 }, (_, i) => ({ skillId: i + 1, level: 3 })) },
  { id: '2', name: 'Kaung Sat Woon', skills: Array.from({ length: 18 }, (_, i) => ({ skillId: i + 1, level: 2 })) },
  { id: '3', name: 'Aung Kaung Myat', skills: Array.from({ length: 18 }, (_, i) => ({ skillId: i + 1, level: 2 })) },
];

const LEVEL_COLORS: { [key: number]: string } = {
  1: 'bg-red-100 text-red-700 hover:bg-red-200',
  2: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  3: 'bg-green-100 text-green-700 hover:bg-green-200',
  4: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  0: 'bg-slate-100 text-slate-500 hover:bg-slate-200',
};

const SkillMatrix: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);

  const handleLevelChange = (empId: string, skillId: number) => {
    setEmployees(prev => prev.map(emp => emp.id === empId ? {
      ...emp,
      skills: emp.skills.map(s => s.skillId === skillId ? { ...s, level: ((s.level + 1) % 5) as any } : s)
    } : emp));
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-widest">Team Skill Matrix</h2>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-2 underline text-xs uppercase tracking-widest">Legend</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <span className="bg-red-100 text-red-700 p-1 rounded">1: Training</span>
                <span className="bg-orange-100 text-orange-700 p-1 rounded">2: Helper</span>
                <span className="bg-green-100 text-green-700 p-1 rounded">3: Qualified</span>
                <span className="bg-blue-100 text-blue-700 p-1 rounded">4: Trainer</span>
            </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-slate-100">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-800"></th>
              {Object.entries(SKILL_CATEGORIES).map(([category, skillIds]) => (
                <th key={category} colSpan={skillIds.length} className="px-2 py-2 text-center text-[10px] font-black uppercase border-r border-slate-700">
                  {category}
                </th>
              ))}
            </tr>
            <tr>
              <th className="px-4 py-4 text-left text-xs font-black uppercase sticky left-0 z-20 bg-slate-800 min-w-[200px]">Employee</th>
              {Object.entries(SKILL_CATEGORIES).flatMap(([_, skillIds]) => 
                skillIds.map(sId => {
                  const skill = SKILLS.find(s => s.id === sId);
                  if (!skill) return null;
                  return (
                    <th key={sId} className="px-2 py-4 text-center cursor-help group relative min-w-[40px]">
                      <span className="block -rotate-45 origin-bottom-left text-[10px] font-bold truncate w-24">
                        <span className="text-slate-400 mr-1">{sId}.</span>
                        {skill.name}
                      </span>
                      <div className="absolute top-0 left-0 hidden group-hover:block bg-black text-white p-2 text-xs rounded z-50 w-48 text-left">
                        {skill.name}<br/><span className="text-[10px] text-slate-300">{skill.myanmarName}</span>
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 text-sm font-bold text-slate-800 sticky left-0 z-10 bg-white border-r border-slate-100">{emp.name}</td>
                {Object.entries(SKILL_CATEGORIES).flatMap(([_, skillIds]) => 
                  skillIds.map(sId => {
                    const skill = emp.skills.find(sk => sk.skillId === sId);
                    const level = skill?.level || 0;
                    return (
                      <td key={sId} className="px-1 py-4 text-center">
                        <button 
                          onClick={() => handleLevelChange(emp.id, sId)}
                          className={`w-8 h-8 rounded-lg text-xs font-black transition-colors ${LEVEL_COLORS[level]}`}
                        >
                          {level}
                        </button>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SkillMatrix;
