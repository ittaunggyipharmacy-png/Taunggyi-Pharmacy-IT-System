import React, { useState, useMemo } from 'react';
import { KPI } from '../types';
import { INITIAL_KPIS } from '../constants';

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

  const groupedKpis = useMemo(() => {
    return calculatedKpis.reduce((acc, kpi) => {
      if (!acc[kpi.role]) acc[kpi.role] = [];
      acc[kpi.role].push(kpi);
      return acc;
    }, {} as Record<string, typeof calculatedKpis>);
  }, [calculatedKpis]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h2 className="text-3xl font-black text-slate-800 mb-8 uppercase tracking-widest">IT Department KPI Dashboard</h2>
      
      {Object.entries(groupedKpis).map(([role, kpis]) => (
        <div key={role} className="mb-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 px-6 py-4">
            <h3 className="text-white font-bold text-lg uppercase tracking-wider">{role}</h3>
          </div>
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">KPI Title</th>
                <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Actual %</th>
                <th className="px-6 py-3 text-center text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Weight</th>
                <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Weighted Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kpis.map(k => (
                <tr key={k.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{k.title} ({k.unit})</td>
                  <td className="px-6 py-4 text-right">
                    <input type="number" value={k.target} onChange={(e) => handleInputChange(k.id, 'target', e.target.value)} className="w-20 border border-slate-200 rounded-lg p-2 text-right font-mono" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input type="number" value={k.actual} onChange={(e) => handleInputChange(k.id, 'actual', e.target.value)} className="w-20 border border-slate-200 rounded-lg p-2 text-right font-mono" />
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-600">{k.actualPercentage.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${k.status === 'Achieved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {k.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-500">{k.weight.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-slate-800">{k.weightedScore.toFixed(2)}</td>
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
