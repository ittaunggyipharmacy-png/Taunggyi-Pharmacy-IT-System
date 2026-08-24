import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Camera, CheckCircle2, Database, KeyRound, Network, Plus, ServerCog, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

type Section = 'network' | 'cctv' | 'backup' | 'maintenance' | 'vendors' | 'access';

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'network', label: 'Network & Internet', icon: Network },
  { id: 'cctv', label: 'CCTV Management', icon: Camera },
  { id: 'backup', label: 'Backup & Recovery', icon: Database },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'vendors', label: 'Vendors', icon: ServerCog },
  { id: 'access', label: 'Access Register', icon: KeyRound },
];

const configs: Record<Section, { table: string; title: string; fields: { key: string; label: string; type?: string }[] }> = {
  network: { table: 'network_assets', title: 'Network & Internet Assets', fields: [
    { key: 'name', label: 'Device / Line Name' }, { key: 'asset_type', label: 'Type' }, { key: 'branch', label: 'Branch' }, { key: 'location', label: 'Location' }, { key: 'ip_address', label: 'IP Address' }, { key: 'isp', label: 'ISP' }, { key: 'status', label: 'Status' }, { key: 'notes', label: 'Notes' }
  ]},
  cctv: { table: 'cctv_assets', title: 'CCTV Inventory', fields: [
    { key: 'name', label: 'Device Name' }, { key: 'device_type', label: 'Type' }, { key: 'branch', label: 'Branch' }, { key: 'location', label: 'Location' }, { key: 'channel', label: 'Channel' }, { key: 'storage_capacity', label: 'Storage' }, { key: 'retention_days', label: 'Retention Days', type: 'number' }, { key: 'status', label: 'Status' }, { key: 'notes', label: 'Notes' }
  ]},
  backup: { table: 'backup_recovery_checks', title: 'Backup & Recovery Checks', fields: [
    { key: 'backup_date', label: 'Date', type: 'date' }, { key: 'backup_type', label: 'Backup Type' }, { key: 'location', label: 'Location' }, { key: 'status', label: 'Status' }, { key: 'responsible_person', label: 'Responsible Person' }, { key: 'recovery_result', label: 'Recovery Result' }, { key: 'notes', label: 'Notes' }
  ]},
  maintenance: { table: 'maintenance_records', title: 'IT Maintenance & Service History', fields: [
    { key: 'asset_name', label: 'Asset' }, { key: 'maintenance_type', label: 'Maintenance Type' }, { key: 'service_date', label: 'Service Date', type: 'date' }, { key: 'technician', label: 'Technician' }, { key: 'problem', label: 'Problem' }, { key: 'action_taken', label: 'Action Taken' }, { key: 'cost', label: 'Cost', type: 'number' }, { key: 'next_maintenance_date', label: 'Next Maintenance', type: 'date' }, { key: 'status', label: 'Status' }
  ]},
  vendors: { table: 'vendors', title: 'IT Vendors & Service Providers', fields: [
    { key: 'name', label: 'Vendor Name' }, { key: 'service_type', label: 'Service Type' }, { key: 'contact_person', label: 'Contact Person' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'branch', label: 'Branch' }, { key: 'contract_start', label: 'Contract Start', type: 'date' }, { key: 'contract_end', label: 'Contract End', type: 'date' }, { key: 'status', label: 'Status' }, { key: 'notes', label: 'Notes' }
  ]},
  access: { table: 'access_control_register', title: 'System Access Control Register', fields: [
    { key: 'user_name', label: 'User' }, { key: 'system_name', label: 'System' }, { key: 'role_name', label: 'Role' }, { key: 'access_level', label: 'Access Level' }, { key: 'approved_by', label: 'Approved By' }, { key: 'granted_at', label: 'Granted', type: 'date' }, { key: 'disabled_at', label: 'Disabled', type: 'date' }, { key: 'status', label: 'Status' }, { key: 'reason', label: 'Reason' }
  ]},
};

export function InfrastructurePage({ isAdmin }: { isAdmin: boolean }) {
  const [section, setSection] = useState<Section>('network');
  const [rows, setRows] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState<Record<string, any>>({});
  const config = configs[section];

  const load = async (s: Section = section) => {
    const c = configs[s];
    const { data, error } = await supabase.from(c.table).select('*').order('created_at', { ascending: false });
    if (error) { toast.error(`Unable to load ${c.title}`); return; }
    setRows(prev => ({ ...prev, [s]: data || [] }));
  };

  useEffect(() => { load(section); }, [section]);

  const currentRows = rows[section] || [];
  const stats = useMemo(() => ({ total: currentRows.length, active: currentRows.filter(r => ['Active', 'Success', 'Completed'].includes(r.status)).length }), [currentRows]);

  const save = async () => {
    const required = config.fields[0]?.key;
    if (!form[required]) { toast.error(`${config.fields[0]?.label} is required`); return; }
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    const { error } = await supabase.from(config.table).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved successfully'); setForm({}); load();
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from(config.table).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); load();
  };

  return <div className="space-y-6 pb-20">
    <div className="enterprise-card p-5 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><ShieldCheck size={22} className="text-indigo-600" /> IT Infrastructure & Control</h2>
          <p className="text-xs text-slate-500 mt-1">Network, CCTV, backup, maintenance, vendor and access records.</p>
        </div>
        <div className="flex gap-3 text-xs"><span className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">Total <b>{stats.total}</b></span><span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">Active <b>{stats.active}</b></span></div>
      </div>
      <div className="flex flex-wrap gap-2 mt-5">
        {sections.map(s => { const Icon = s.icon; return <button key={s.id} onClick={() => setSection(s.id)} className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition ${section === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}><Icon size={14}/>{s.label}</button>; })}
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
      <div className="enterprise-card p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Plus size={16}/> Add Record</h3>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {config.fields.map(f => <label key={f.key} className="block"><span className="block text-[11px] font-medium text-slate-500 mb-1">{f.label}</span><input type={f.type || 'text'} value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100" /></label>)}
          <button disabled={!isAdmin} onClick={save} className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">Save Record</button>
          {!isAdmin && <p className="text-[11px] text-amber-600">Admin permission is required to create records.</p>}
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800"><h3 className="font-semibold text-slate-800 dark:text-slate-100">{config.title}</h3></div>
        <div className="overflow-auto max-h-[65vh]"><table className="w-full text-left"><thead className="sticky top-0 bg-slate-50 dark:bg-slate-800"><tr>{config.fields.slice(0, 6).map(f => <th key={f.key} className="px-4 py-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap">{f.label}</th>)}<th className="px-4 py-3"/></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{currentRows.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-xs text-slate-400">No records yet</td></tr> : currentRows.map(r => <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">{config.fields.slice(0, 6).map(f => <td key={f.key} className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{String(r[f.key] ?? '-')}</td>)}<td className="px-4 py-3 text-right">{isAdmin && <button onClick={() => remove(r.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14}/></button>}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  </div>;
}
