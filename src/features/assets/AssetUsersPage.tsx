import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, ChevronRight, Package, Plus, Search, UserRound, X, UserPlus, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SystemUser, ITAsset, AssetPerson } from '../../types';
import { getAllSystemUsers } from '../../services/userService';
import { fetchAssets } from '../../services/assetService';
import {
  assignAssetToPerson, createAssetPerson, getAssetPeople, getAssetPersonAssignments,
  getUserAssetAssignments, getUserAssignmentHistory, returnAsset, updateAssetHolderName,
  AssetAssignmentRecord,
} from '../../services/assetAssignmentService';

type AssetHolder =
  | { kind: 'person'; person: AssetPerson }
  | { kind: 'login'; user: SystemUser };

interface AssetUsersPageProps { currentUserId?: string; isAdmin: boolean; }

export function AssetUsersPage({ currentUserId, isAdmin }: AssetUsersPageProps) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [people, setPeople] = useState<AssetPerson[]>([]);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [selectedHolder, setSelectedHolder] = useState<AssetHolder | null>(null);
  const [assignments, setAssignments] = useState<AssetAssignmentRecord[]>([]);
  const [history, setHistory] = useState<AssetAssignmentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assetToAssign, setAssetToAssign] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personForm, setPersonForm] = useState({ fullName: '', employeeId: '', position: '', department: '', branch: '', notes: '' });
  const [savingPerson, setSavingPerson] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  const loadUsersAndAssets = useCallback(async () => {
    setLoading(true);
    try {
      const [nextUsers, nextPeople, nextAssets] = await Promise.all([getAllSystemUsers(), getAssetPeople(), fetchAssets()]);
      setUsers(nextUsers); setPeople(nextPeople); setAssets(nextAssets);
    } catch (error) { console.error(error); toast.error('Asset Users / Assets များကို load မလုပ်နိုင်ပါ။'); }
    finally { setLoading(false); }
  }, []);

  const loadHolderDetail = useCallback(async (holder: AssetHolder) => {
    setSelectedHolder(holder); setDetailLoading(true);
    try {
      const result = holder.kind === 'person'
        ? await getAssetPersonAssignments(holder.person.id, true)
        : await Promise.all([getUserAssetAssignments(holder.user.uid), getUserAssignmentHistory(holder.user.uid)]).then(([active, allHistory]) => ({ active, allHistory }));
      if (holder.kind === 'person') {
        const all = result as AssetAssignmentRecord[]; setAssignments(all.filter(a => a.status === 'Active')); setHistory(all);
      } else {
        const { active, allHistory } = result as { active: AssetAssignmentRecord[]; allHistory: AssetAssignmentRecord[] };
        setAssignments(active); setHistory(allHistory);
      }
    } catch (error) { console.error(error); toast.error('Assignment information load မအောင်မြင်ပါ။'); setAssignments([]); setHistory([]); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { loadUsersAndAssets(); }, [loadUsersAndAssets]);

  const holders = useMemo<AssetHolder[]>(() => {
    const loginHolders: AssetHolder[] = users.map(user => ({ kind: 'login', user }));
    const loginIds = new Set(users.map(u => u.uid));
    const peopleHolders: AssetHolder[] = people.filter(person => !person.linkedUserId || !loginIds.has(person.linkedUserId)).map(person => ({ kind: 'person', person }));
    return [...peopleHolders, ...loginHolders];
  }, [users, people]);

  const visibleHolders = useMemo(() => {
    const term = search.trim().toLowerCase(); if (!term) return holders;
    return holders.filter(holder => {
      const values = holder.kind === 'person'
        ? [holder.person.fullName, holder.person.employeeId, holder.person.position, holder.person.department, holder.person.branch, 'asset user']
        : [holder.user.displayName, holder.user.email, holder.user.employeeId, holder.user.position, holder.user.department, holder.user.branch, holder.user.role, 'login user'];
      return values.some(value => value?.toLowerCase().includes(term));
    });
  }, [holders, search]);

  const assignedAssetIds = useMemo(() => new Set(assignments.map(item => item.assetId)), [assignments]);
  const availableAssets = useMemo(() => assets.filter(asset => {
    const status = String(asset.status || '').toLowerCase();
    return !assignedAssetIds.has(asset.id) && ['active', 'in stock', 'new'].includes(status) && asset.assignedTo === 'Unassigned';
  }), [assets, assignedAssetIds]);

  const handleCreatePerson = async () => {
    if (!personForm.fullName.trim()) { toast.error('Name ဖြည့်ပေးပါ။'); return; }
    setSavingPerson(true);
    try {
      const created = await createAssetPerson({ fullName: personForm.fullName.trim(), employeeId: personForm.employeeId.trim() || null, position: personForm.position.trim() || null, department: personForm.department.trim() || null, branch: personForm.branch.trim() || null, status: 'Active', notes: personForm.notes.trim() || null, linkedUserId: null });
      setPeople(prev => [...prev, created].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setPersonForm({ fullName: '', employeeId: '', position: '', department: '', branch: '', notes: '' }); setShowPersonForm(false);
      toast.success(`${created.fullName} ကို Asset User အဖြစ် မှတ်ထားပြီးပါပြီ။`);
    } catch (error: any) { console.error(error); toast.error(error?.message || 'Asset User ထည့်မရပါ။'); }
    finally { setSavingPerson(false); }
  };

  const startEditName = () => { if (!selectedHolder) return; setNameDraft(selectedHolder.kind === 'person' ? selectedHolder.person.fullName : selectedHolder.user.displayName); setEditingName(true); };
  const cancelEditName = () => { if (!savingName) { setEditingName(false); setNameDraft(''); } };

  const handleSaveName = async () => {
    if (!selectedHolder) return;
    const name = nameDraft.trim();
    if (!name) { toast.error('User name ဖြည့်ပေးပါ။'); return; }
    setSavingName(true);
    try {
      if (selectedHolder.kind === 'person') await updateAssetHolderName({ kind: 'person', id: selectedHolder.person.id }, name);
      else await updateAssetHolderName({ kind: 'login', uid: selectedHolder.user.uid }, name);
      const updated: AssetHolder = selectedHolder.kind === 'person'
        ? { kind: 'person', person: { ...selectedHolder.person, fullName: name } }
        : { kind: 'login', user: { ...selectedHolder.user, displayName: name } };
      setSelectedHolder(updated);
      setPeople(prev => prev.map(p => p.id === (updated.kind === 'person' ? updated.person.id : '') ? { ...p, fullName: name } : p));
      setUsers(prev => prev.map(u => u.uid === (updated.kind === 'login' ? updated.user.uid : updated.kind === 'person' ? updated.person.linkedUserId : '') ? { ...u, displayName: name } : u));
      setEditingName(false); setNameDraft('');
      toast.success('User name ကိုပြောင်းပြီးပါပြီ။');
      await loadUsersAndAssets();
    } catch (error: any) { console.error(error); toast.error(error?.message || 'User name ပြောင်းမရပါ။'); }
    finally { setSavingName(false); }
  };

  const handleAssign = async () => {
    if (!selectedHolder || !assetToAssign || selectedHolder.kind !== 'person') {
      if (selectedHolder?.kind === 'login' && assetToAssign) toast.error('Login User ကို Asset User record နဲ့ link လုပ်ထားတဲ့ workflow ကို သုံးပါ။');
      return;
    }
    setAssigning(true);
    try {
      await assignAssetToPerson({ assetId: assetToAssign, assetPersonId: selectedHolder.person.id, assignedBy: currentUserId, notes: assignNotes.trim() || undefined });
      toast.success(`${selectedHolder.person.fullName} ဆီ Asset assign လုပ်ပြီးပါပြီ။`); setAssetToAssign(''); setAssignNotes('');
      await Promise.all([loadUsersAndAssets(), loadHolderDetail(selectedHolder)]);
    } catch (error: any) { console.error(error); toast.error(error?.message || 'Asset assign မအောင်မြင်ပါ။'); }
    finally { setAssigning(false); }
  };

  const handleReturn = async (assignment: AssetAssignmentRecord) => {
    if (!returningId) { setReturningId(assignment.id); setReturnReason(''); return; }
    if (returningId !== assignment.id) return;
    try {
      await returnAsset({ assignmentId: assignment.id, returnReason: returnReason.trim() || undefined });
      toast.success('Asset return လုပ်ပြီးပါပြီ။'); setReturningId(null); setReturnReason('');
      if (selectedHolder) await Promise.all([loadUsersAndAssets(), loadHolderDetail(selectedHolder)]);
    } catch (error: any) { console.error(error); toast.error(error?.message || 'Asset return မအောင်မြင်ပါ။'); }
  };

  const holderName = selectedHolder?.kind === 'person' ? selectedHolder.person.fullName : selectedHolder?.user.displayName || '';

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading asset users and assets...</div>;

  if (selectedHolder) {
    const employeeId = selectedHolder.kind === 'person' ? selectedHolder.person.employeeId : selectedHolder.user.employeeId;
    const position = selectedHolder.kind === 'person' ? selectedHolder.person.position : (selectedHolder.user.position || selectedHolder.user.role);
    const department = selectedHolder.kind === 'person' ? selectedHolder.person.department : selectedHolder.user.department;
    const branch = selectedHolder.kind === 'person' ? selectedHolder.person.branch : selectedHolder.user.branch;
    const isAssetPerson = selectedHolder.kind === 'person';

    return <section className="space-y-5">
      <button type="button" onClick={() => { setSelectedHolder(null); setEditingName(false); }} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"><ArrowLeft size={17} /> Back to Asset Users</button>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><UserRound size={25} /></div><div className="min-w-0 flex-1">
            {editingName ? <div className="flex flex-wrap items-center gap-2"><input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') cancelEditName(); }} className="w-full max-w-sm rounded-xl border border-blue-300 px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" disabled={savingName} /><button type="button" onClick={handleSaveName} disabled={savingName} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingName ? 'Saving...' : 'Save'}</button><button type="button" onClick={cancelEditName} disabled={savingName} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button></div> : <div className="flex items-center gap-2"><h1 className="truncate text-xl font-bold text-slate-900">{holderName}</h1>{isAdmin && <button type="button" onClick={startEditName} title="Edit user name" className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>}<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{isAssetPerson ? 'ASSET USER' : 'LOGIN USER'}</span></div>}
            <p className="text-sm text-slate-500">{position || '-'} · {department || '-'} · {branch || '-'}</p><p className="mt-1 text-xs text-slate-400">Employee ID: {employeeId || '-'}{selectedHolder.kind === 'login' ? ` · ${selectedHolder.user.email}` : ''}</p>
          </div></div>
          <div className="rounded-2xl bg-blue-50 px-5 py-3 text-center text-blue-700"><div className="text-2xl font-bold">{assignments.length}</div><div className="text-xs font-medium">Active Assets</div></div>
        </div>
      </div>

      {isAdmin && isAssetPerson && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-600" /><h2 className="font-semibold text-slate-900">Assign Asset</h2></div><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><select value={assetToAssign} onChange={e => setAssetToAssign(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">Select available asset...</option>{availableAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.asset_code || asset.id} · {asset.category} · {asset.model}</option>)}</select><input value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Notes (optional)" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><button disabled={!assetToAssign || assigning} onClick={handleAssign} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{assigning ? 'Assigning...' : 'Assign'}</button></div>{availableAssets.length === 0 && <p className="mt-3 text-xs text-amber-600">Assign လုပ်နိုင်တဲ့ unassigned Asset မရှိသေးပါ။</p>}</div>}

      {!isAssetPerson && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">ဒီ Login User ကို Asset User အဖြစ် automatically link လုပ်နိုင်တဲ့ architecture ပါပြီးသားပါ။ User name ကို ဒီနေရာက edit လုပ်ရင် login account name နဲ့ assigned asset records တွေပါ sync ဖြစ်ပါတယ်။</div>}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Assigned Assets</h2></div>{detailLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading assignments...</div> : assignments.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">ဒီ User ဆီမှာ Active Asset မရှိသေးပါ။</div> : <div className="divide-y divide-slate-100">{assignments.map(assignment => <div key={assignment.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Package size={17} className="text-blue-600" /><span className="font-semibold text-slate-900">{assignment.asset?.asset_code || assignment.assetId}</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span></div><p className="mt-1 text-sm text-slate-600">{assignment.asset?.category || '-'} · {assignment.asset?.model || '-'}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={13} /> Assigned {assignment.assignedDate}</p></div>{isAdmin && <div className="flex items-center gap-2">{returningId === assignment.id && <input autoFocus value={returnReason} onChange={e => setReturnReason(e.target.value)} placeholder="Return reason" className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-xs" />}<button type="button" onClick={() => handleReturn(assignment)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">{returningId === assignment.id ? 'Confirm Return' : 'Return'}</button>{returningId === assignment.id && <button type="button" onClick={() => setReturningId(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={15} /></button>}</div>}</div>)}</div>}</div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Assignment History</h2></div>{history.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">History မရှိသေးပါ။</div> : <div className="divide-y divide-slate-100">{history.map(item => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><div><span className="font-medium text-slate-800">{item.asset?.asset_code || item.assetId}</span><span className="ml-2 text-slate-500">{item.asset?.model || '-'}</span></div><div className="text-right text-xs text-slate-400"><div>{item.assignedDate} → {item.returnDate || 'Current'}</div><div className="font-medium">{item.status}</div></div></div>)}</div>}</div>
    </section>;
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Assets by User</h1><p className="text-sm text-slate-500">Login မဝင်နိုင်တဲ့ ဝန်ထမ်းတွေကိုပါ Asset User အဖြစ် မှတ်ထားပြီး Asset Assign / Return လုပ်နိုင်ပါတယ်။</p></div><div className="flex gap-2 w-full sm:w-auto"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, employee ID, branch..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>{isAdmin && <button type="button" onClick={() => setShowPersonForm(v => !v)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><UserPlus size={16} /> Add Asset User</button>}</div></div>

    {isAdmin && showPersonForm && <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold text-slate-900">Add Asset User (Login မလို)</h2><div className="grid gap-3 md:grid-cols-3"><input placeholder="Full Name *" value={personForm.fullName} onChange={e => setPersonForm(p => ({ ...p, fullName: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input placeholder="Employee ID" value={personForm.employeeId} onChange={e => setPersonForm(p => ({ ...p, employeeId: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input placeholder="Position" value={personForm.position} onChange={e => setPersonForm(p => ({ ...p, position: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input placeholder="Department" value={personForm.department} onChange={e => setPersonForm(p => ({ ...p, department: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input placeholder="Branch" value={personForm.branch} onChange={e => setPersonForm(p => ({ ...p, branch: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input placeholder="Notes" value={personForm.notes} onChange={e => setPersonForm(p => ({ ...p, notes: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setShowPersonForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button><button type="button" disabled={savingPerson} onClick={handleCreatePerson} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingPerson ? 'Saving...' : 'Save Asset User'}</button></div></div>}

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleHolders.map(holder => { const name = holder.kind === 'person' ? holder.person.fullName : holder.user.displayName; const employeeId = holder.kind === 'person' ? holder.person.employeeId : holder.user.employeeId; const department = holder.kind === 'person' ? holder.person.department : holder.user.department; const branch = holder.kind === 'person' ? holder.person.branch : holder.user.branch; return <button key={`${holder.kind}-${holder.kind === 'person' ? holder.person.id : holder.user.uid}`} type="button" onClick={() => loadHolderDetail(holder)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRound size={20} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate font-semibold text-slate-900">{name}</h3><ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" /></div><div className="flex items-center gap-2"><p className="truncate text-xs text-slate-500">{employeeId || '-'}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">{holder.kind === 'person' ? 'ASSET USER' : 'LOGIN USER'}</span></div></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-2.5"><div className="mb-1 flex items-center gap-1 text-slate-400"><Building2 size={13} /> Department</div><div className="truncate font-medium text-slate-700">{department || '-'}</div></div><div className="rounded-xl bg-slate-50 p-2.5"><div className="mb-1 text-slate-400">Branch</div><div className="truncate font-medium text-slate-700">{branch || '-'}</div></div></div></button>; })}</div>
    {visibleHolders.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">No Asset Users found.</div>}
  </section>;
}
