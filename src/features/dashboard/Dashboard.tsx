import React from 'react';
import { 
  Activity, 
  Clock, 
  Camera, 
  Download 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { 
  BarChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { safeFormat } from '../../utils/file';

interface DashboardStatsProps {
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  exportKPISummary: () => void;
  activities: any[];
  chartData: any[];
  evidence: any[];
  staffPerformance: any[];
}

export const Dashboard: React.FC<DashboardStatsProps> = ({ 
  dateRange, 
  setDateRange, 
  exportKPISummary, 
  activities, 
  chartData, 
  evidence, 
  staffPerformance 
}) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-slate-800 dark:text-slate-100">IT Supervisor Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time Performance & Subordinate Monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="px-3 py-2 border rounded-xl" />
          <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="px-3 py-2 border rounded-xl" />
          <button 
            onClick={exportKPISummary}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium text-xs hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
          >
            <Download size={16} />
            Export KPI Report (XLSX)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed */}
        <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 flex flex-col h-[600px]">
          <h3 className="text-sm font-medium text-slate-400 mb-6 flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            Live Activity Feed
          </h3>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {activities.length === 0 ? (
              <div className="text-center py-20 grayscale opacity-50">
                <Clock size={40} className="mx-auto mb-3" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No activities logged</p>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="relative pl-6 border-l-2 border-slate-100 pb-1">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-sm" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-400 ">
                      {safeFormat(act.timestamp, "HH:mm • dd MMM")}
                    </span>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1">
                      <span className="text-indigo-600">{act.userName}</span> {act.action}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 dark:text-slate-400 w-fit mt-1.5 font-medium">
                      {act.department}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Charts and Evidence */}
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Chart */}
          <div className="enterprise-card p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-6">Staff Daily Completion Rate (%)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar 
                    dataKey="progress" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                    label={{ position: 'top', fontSize: 10, fontWeight: 'bold', fill: '#6366f1' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Evidence */}
          <div className="enterprise-card p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-6 flex items-center justify-between">
              Recent Photo Evidence
              <span className="text-xs lowercase text-slate-400 font-normal tracking-normal italic">Proof of completion</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {evidence.slice(0, 8).map((ev) => (
                <div key={ev.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                  <img src={ev.imageUrl} alt="Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-end">
                    <p className="text-xs font-medium text-white ">{ev.userName}</p>
                    <p className="text-xs text-white/70 line-clamp-1">{ev.taskId}</p>
                  </div>
                </div>
              ))}
              {evidence.length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Camera className="mx-auto text-slate-300 mb-2" size={24} />
                  <p className="text-xs font-medium text-slate-400 ">No photo evidence uploaded yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Staff Performance Ranking */}
          <div className="enterprise-card p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-6">Staff Performance & Skill Growth</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300  pb-3">Staff Member</th>
                    <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300  pb-3">Department</th>
                    <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300  pb-3">KPI Completion</th>
                    <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300  pb-3">Avg Skill Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffPerformance.map(emp => (
                    <tr key={emp.id}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-medium text-xs">
                            {emp.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{emp.name}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-slate-50 text-slate-500 dark:text-slate-400 rounded text-xs font-medium">{emp.department}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${emp.completionRate}%` }} />
                          </div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{emp.completionRate}%</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 text-sm">★</span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{emp.avgSkill}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staffPerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs font-medium text-slate-400 ">
                        No employees recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
