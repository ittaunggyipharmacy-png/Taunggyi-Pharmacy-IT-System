import React, { useState, useMemo } from 'react';
import { KPI } from '../../types';
import { INITIAL_KPIS } from '../../constants';

const KPIDashboard: React.FC = () => {
 const [kpis, setKpis] = useState<KPI[]>(INITIAL_KPIS);

 const handleInputChange = (id: string, field: 'target' | 'actual', value: string) => {
 const numValue = parseFloat(value) || 0;
 setKpis(prev => prev.map(k => k.id === id ? { ...k, [field]: numValue } : k));
 };

 const calculatedKpis = useMemo(() => {
 return kpis.map(k => {
 const actualPercentage = k.target !== 0 ? (k.actual / k.target) * 100 : 0;
 const status = actualPercentage >= (k.target ? 100 : 0) ? "Achieved" : "In Progress";
 const weightedScore = (Math.min(actualPercentage, 100) * k.weight) / 100;
 return { ...k, actualPercentage, status, weightedScore };
 });
 }, [kpis]);

 const groupedKpis = useMemo<Record<string, typeof calculatedKpis>>(() => {
 return calculatedKpis.reduce((acc, kpi) => {
 if (!acc[kpi.role]) acc[kpi.role] = [];
 acc[kpi.role].push(kpi);
 return acc;
 }, {} as Record<string, typeof calculatedKpis>);
 }, [calculatedKpis]);

 return (
 <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
 <h2 className="text-3xl font-medium text-slate-800 dark:text-slate-100 mb-8 ">IT Department KPI Dashboard</h2>
 
 {Object.entries(groupedKpis).map(([role, kpis]) => (
 <div key={role} className="mb-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
 <div className="bg-slate-800 dark:bg-slate-950 px-4 py-3.5">
 <h3 className="text-white font-medium text-lg ">{role}</h3>
 </div>
 <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
 <thead className="bg-slate-50 dark:bg-slate-800/50">
 <tr className="text-slate-600 dark:text-slate-400 font-semibold  text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-6 py-3 text-left">KPI Title</th>
 <th className="px-6 py-3 text-right">Target</th>
 <th className="px-6 py-3 text-right">Actual</th>
 <th className="px-6 py-3 text-right">Actual %</th>
 <th className="px-6 py-3 text-center">Status</th>
 <th className="px-6 py-3 text-right">Weight</th>
 <th className="px-6 py-3 text-right">Weighted Score</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {kpis.map(k => (
 <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
 <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-300">{k.title} ({k.unit})</td>
 <td className="px-4 py-3.5 text-right">
 <input type="number" value={k.target} onChange={(e) => handleInputChange(k.id, 'target', e.target.value)} className="w-20 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-right font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
 </td>
 <td className="px-4 py-3.5 text-right">
 <input type="number" value={k.actual} onChange={(e) => handleInputChange(k.id, 'actual', e.target.value)} className="w-20 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-right font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
 </td>
 <td className="px-4 py-3.5 text-right text-sm font-medium text-slate-600 dark:text-slate-400">{k.actualPercentage.toFixed(2)}%</td>
 <td className="px-4 py-3.5 text-center">
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${k.status === 'Achieved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
 {k.status}
 </span>
 </td>
 <td className="px-4 py-3.5 text-right text-sm font-medium text-slate-500 dark:text-slate-400">{k.weight.toFixed(2)}%</td>
 <td className="px-4 py-3.5 text-right text-sm font-medium text-slate-800 dark:text-slate-100">{k.weightedScore.toFixed(2)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ))}
 </div>
 );
};

export default KPIDashboard;
