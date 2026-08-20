import React from 'react';
import { 
  AlertTriangle, 
  BarChart2, 
  Wrench, 
  HardDrive, 
  Plus, 
  Activity, 
  RefreshCw, 
  Download, 
  Search 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart as RePieChart, 
  Pie 
} from 'recharts';
import { ITTicket, ITAsset, BackupLog, Priority } from '../types';
import { formatStorage } from '../lib/utils';

interface DashboardProps {
  tickets: ITTicket[];
  assets: ITAsset[];
  backups: BackupLog[];
  quota: { limit: string; usage: string } | null;
}

export function Dashboard({ tickets, assets, backups, quota }: DashboardProps) {
  const activeAssets = assets.filter(a => a.status === "Active").length;
  const underRepairAssets = assets.filter(a => a.status === "Under Repair" || a.status === "Maintenance").length;

  const summaryStats = [
    { 
      label: "Critical Tickets", 
      current: tickets.filter(t => t.priority === Priority.CRITICAL).length, 
      total: tickets.length, 
      sub: "Total tickets", 
      icon: AlertTriangle, 
      color: "text-rose-500", 
      iconColor: "text-rose-500" 
    },
    { 
      label: "Active Assets", 
      current: activeAssets, 
      total: assets.length, 
      sub: "Inventory status", 
      icon: BarChart2, 
      color: "text-indigo-600", 
      iconColor: "text-indigo-600" 
    },
    { 
      label: "Under Repair", 
      current: underRepairAssets, 
      total: assets.length, 
      sub: "Hardware offline", 
      icon: Wrench, 
      color: "text-emerald-500", 
      iconColor: "text-emerald-500" 
    },
    { 
      label: "Cloud Storage", 
      current: quota ? formatStorage(quota.usage) : "...", 
      total: quota ? formatStorage(Number(quota.limit) || 2199023255552) : "...", 
      sub: "Drive Quota", 
      icon: HardDrive, 
      color: "text-indigo-600", 
      iconColor: "text-indigo-600" 
    },
  ];

  const inventoryData = [
    { name: 'SWITCHES', value: assets.filter(a => a.category === "Network").length || 4 },
    { name: 'DESKTOP', value: assets.filter(a => a.brand === "Desktop").length || 6 },
    { name: 'LAPTOPS', value: assets.filter(a => a.category === "Computer" && a.brand !== "Desktop").length || 12 },
    { name: 'SERVER', value: 2 },
  ];

  const pieData = [
    { name: 'Finance', value: 45, color: '#A855F7' },
    { name: 'IOT', value: 5, color: '#38BDF8' },
    { name: 'IT', value: 45, color: '#6366F1' },
    { name: 'NMS', value: 5, color: '#6366F1' },
  ];

  const licenses = [
    { name: "Microsoft Windows 11 Pro", used: 12, total: 15, logo: "W" },
    { name: "Microsoft Office 365", used: 45, total: 50, logo: "O" },
    { name: "Adobe Creative Cloud", used: 2, total: 5, logo: "A" },
    { name: "Tally ERP 9", used: 4, total: 4, logo: "T" },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium text-slate-800 dark:text-slate-100">Inventory dashboard</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus size={18} />
            <span>Add items</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryStats.map((stat, i) => (
            <div key={i} className="enterprise-card p-6 flex flex-col justify-between h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="flex items-start justify-between">
                <stat.icon className={stat.iconColor} size={24} />
              </div>
              <div>
                <div className="text-3xl font-medium text-slate-900 dark:text-white">
                  {stat.current}
                  {stat.total && <span className="text-slate-400 text-xl">/{stat.total}</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.sub}</p>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Counter Chart */}
          <div className="enterprise-card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Inventory counter</h3>
                <div className="flex gap-4 mt-2">
                  <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 pb-1">Device</button>
                  <button className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:text-slate-300">Spare parts</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"><Activity size={16} /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"><RefreshCw size={16} /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"><Download size={16} /></button>
              </div>
            </div>
            
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={250}>
                <BarChart layout="vertical" data={inventoryData} margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar 
                    dataKey="value" 
                    fill="#6366F1" 
                    radius={[0, 4, 4, 0]} 
                    barSize={32}
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#C084FC', '#4F46E5', '#2DD4BF', '#818CF8'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workstations Chart */}
          <div className="enterprise-card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Workstations</h3>
              <button className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"><Download size={16} /></button>
            </div>
            <div className="flex gap-4 mb-6">
              <button className="text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 pb-1">State count</button>
              <button className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:text-slate-300">Department count</button>
            </div>

            <div className="relative h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={250}>
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total</p>
                <p className="text-2xl font-medium text-slate-800 dark:text-slate-100">100%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{item.name} {item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right License Sidebar */}
      <div className="xl:col-start-2 xl:row-start-1">
        <div className="enterprise-card p-6 h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-6">Purchased license</h3>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
            />
          </div>
          
          <div className="space-y-6">
            {licenses.map((license, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {license.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{license.name}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {license.used} Used • {license.total - license.used} Available
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${(license.used / license.total) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-10 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors border-t border-slate-100 dark:border-slate-800">
            Manage All Licenses
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
