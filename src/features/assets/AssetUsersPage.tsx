import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, ChevronRight, MapPin, Package, Pencil, Plus, RefreshCw, Search, Trash2, UserPlus, UserRound, Users, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ITAsset, AssetPerson, SystemSettings } from '../../types';
import { fetchAssets, updateAssetAssignment } from '../../services/assetService';
import { getSettings } from '../../services/settingsService';
import { SearchableDropdown } from '../../components/SearchableDropdown';
import {
  assignAssetToPerson,
  createAssetPerson,
  deleteAssetPerson,
  getAssetPeople,
  getAssetPersonAssignments,
  returnAsset,
  syncAssetAssignmentByName,
  updateAssetHolderName,
  AssetAssignmentRecord,
} from '../../services/assetAssignmentService';
import { AssetCategoryIcon, AssetCategoryBadge } from './components/AssetCategoryIcon';

interface AssetUsersPageProps {
  currentUserId?: string;
  isAdmin: boolean;
  settings?: SystemSettings;
}

export function AssetUsersPage({ currentUserId, isAdmin, settings: propSettings }: AssetUsersPageProps) {
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(propSettings || null);
  const [people, setPeople] = useState<AssetPerson[]>([]);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<AssetPerson | null>(null);
  const [assignments, setAssignments] = useState<AssetAssignmentRecord[]>([]);
  const [history, setHistory] = useState<AssetAssignmentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetDepartment, setAssetDepartment] = useState('');
  const [assetCategory, setAssetCategory] = useState('');
  const [assetBranch, setAssetBranch] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personForm, setPersonForm] = useState({ fullName: '', employeeId: '', position: '', department: '', branch: '', notes: '' });
  const [savingPerson, setSavingPerson] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (propSettings) setSystemSettings(propSettings);
    else getSettings().then(res => res && setSystemSettings(res));
  }, [propSettings]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nextPeople, nextAssets, nextSettings] = await Promise.all([
        getAssetPeople(),
        fetchAssets(),
        !propSettings ? getSettings() : Promise.resolve(null),
      ]);
      setPeople(nextPeople);
      setAssets(nextAssets);
      if (nextSettings) setSystemSettings(nextSettings);
    } catch (error) {
      console.error(error);
      toast.error('Asset People / Assets များကို load မလုပ်နိုင်ပါ။');
    } finally {
      setLoading(false);
    }
  }, [propSettings]);

  const loadPersonDetail = useCallback(async (person: AssetPerson) => {
    setSelectedPerson(person);
    setDetailLoading(true);
    setSelectedAssetIds([]);
    setAssetSearch('');
    setAssetDepartment('');
    setAssetCategory('');
    setAssetBranch('');
    try {
      const all = await getAssetPersonAssignments(person.id, true);
      setAssignments(all.filter(a => a.status === 'Active'));
      setHistory(all);
    } catch (error) {
      console.error(error);
      toast.error('Asset assignment information load မအောင်မြင်ပါ။');
      setAssignments([]);
      setHistory([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const visiblePeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return people;
    return people.filter(person => [person.fullName, person.employeeId, person.position, person.department, person.branch]
      .some(value => String(value || '').toLowerCase().includes(term)));
  }, [people, search]);

  const departmentOptions = useMemo(() => {
    const values = [
      ...(systemSettings?.departments || []),
      ...people.map(p => p.department),
      ...assets.map(a => a.department),
    ];
    return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [systemSettings, people, assets]);

  const branchOptions = useMemo(() => {
    const values = [
      ...(systemSettings?.locations || []),
      ...(systemSettings?.branchNotes?.map(b => b.name) || []),
      ...people.map(p => p.branch),
      ...assets.map(a => a.branch || a.location),
    ];
    return Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [systemSettings, people, assets]);

  const assignedAssetIds = useMemo(() => new Set(assignments.map(a => a.assetId)), [assignments]);
  const availableAssets = useMemo(() => assets.filter(asset => {
    if (asset.isPurged) return false;
    const status = String(asset.status || '').toLowerCase();
    const unassigned = !asset.assignedTo || asset.assignedTo.toLowerCase() === 'unassigned';
    return !assignedAssetIds.has(asset.id) && ['active', 'in stock', 'new'].includes(status) && unassigned;
  }), [assets, assignedAssetIds]);

  const assetDepartments = useMemo(() => Array.from(new Set(availableAssets.map(a => a.department).filter(Boolean))).sort(), [availableAssets]);
  const assetCategories = useMemo(() => Array.from(new Set(availableAssets.map(a => a.category).filter(Boolean))).sort(), [availableAssets]);
  const assetBranches = useMemo(() => Array.from(new Set(availableAssets.map(a => a.branch).filter(Boolean))).sort(), [availableAssets]);

  const filteredAvailableAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    return availableAssets.filter(asset => {
      const matchesDepartment = !assetDepartment || String(asset.department || '') === assetDepartment;
      const matchesCategory = !assetCategory || String(asset.category || '') === assetCategory;
      const matchesBranch = !assetBranch || String(asset.branch || '') === assetBranch;
      const searchValues = [asset.asset_code, asset.name, asset.model, asset.category, asset.serialNumber, asset.brand, asset.department, asset.branch];
      const matchesSearch = !term || searchValues.some(value => String(value || '').toLowerCase().includes(term));
      return matchesDepartment && matchesCategory && matchesBranch && matchesSearch;
    });
  }, [availableAssets, assetSearch, assetDepartment, assetCategory, assetBranch]);

  const toggleAsset = (id: string) => setSelectedAssetIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleVisibleAssets = () => {
    const ids = filteredAvailableAssets.map(a => a.id);
    setSelectedAssetIds(prev => ids.length > 0 && ids.every(id => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
  };

  const handleCreatePerson = async () => {
    if (!personForm.fullName.trim()) { toast.error('Name ဖြည့်ပေးပါ။'); return; }
    setSavingPerson(true);
    try {
      const created = await createAssetPerson({
        fullName: personForm.fullName.trim(),
        employeeId: personForm.employeeId.trim() || null,
        position: personForm.position.trim() || null,
        department: personForm.department.trim() || null,
        branch: personForm.branch.trim() || null,
        status: 'Active',
        notes: personForm.notes.trim() || null,
      });
      setPeople(prev => [...prev.filter(p => p.id !== created.id), created].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setPersonForm({ fullName: '', employeeId: '', position: '', department: '', branch: '', notes: '' });
      setShowPersonForm(false);
      toast.success(`${created.fullName} ကို Asset User အဖြစ် မှတ်ထားပြီးပါပြီ။`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Asset User ထည့်မရပါ။');
    } finally { setSavingPerson(false); }
  };

  const startEditName = () => { if (selectedPerson) { setNameDraft(selectedPerson.fullName); setEditingName(true); } };
  const cancelEditName = () => { if (!savingName) { setEditingName(false); setNameDraft(''); } };

  const handleSaveName = async () => {
    if (!selectedPerson) return;
    const name = nameDraft.trim();
    if (!name) { toast.error('User name ဖြည့်ပေးပါ။'); return; }
    setSavingName(true);
    try {
      await updateAssetHolderName({ kind: 'person', id: selectedPerson.id }, name);
      const updated = { ...selectedPerson, fullName: name };
      setSelectedPerson(updated);
      setPeople(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingName(false);
      setNameDraft('');
      toast.success('Asset User name ကိုပြောင်းပြီးပါပြီ။');
      await loadData();
      await loadPersonDetail(updated);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'User name ပြောင်းမရပါ။');
    } finally { setSavingName(false); }
  };

  const handleAssign = async () => {
    if (!selectedPerson || selectedAssetIds.length === 0) return;
    setAssigning(true);
    try {
      await Promise.all(selectedAssetIds.map(assetId => assignAssetToPerson({
        assetId,
        assetPersonId: selectedPerson.id,
        assignedBy: currentUserId,
        notes: assignNotes.trim() || undefined,
      })));
      toast.success(`${selectedAssetIds.length} Asset ကို ${selectedPerson.fullName} ဆီ assign လုပ်ပြီးပါပြီ။`);
      setSelectedAssetIds([]);
      setAssignNotes('');
      await loadData();
      await loadPersonDetail(selectedPerson);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Asset assign မအောင်မြင်ပါ။');
    } finally { setAssigning(false); }
  };

  const handleReturn = async (assignment: AssetAssignmentRecord) => {
    if (returningId !== assignment.id) { setReturningId(assignment.id); setReturnReason(''); return; }
    try {
      await returnAsset({ assignmentId: assignment.id, returnReason: returnReason.trim() || undefined });
      toast.success('Asset return လုပ်ပြီးပါပြီ။');
      setReturningId(null);
      setReturnReason('');
      if (selectedPerson) { await loadData(); await loadPersonDetail(selectedPerson); }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Asset return မအောင်မြင်ပါ။');
    }
  };

  const handleDeletePerson = async () => {
    if (!selectedPerson) return;
    if (assignments.length > 0) { toast.error('ဒီ Asset User ဆီမှာ Active Asset ရှိနေသေးပါတယ်။ အရင် Return / Reassign လုပ်ပါ။'); return; }
    if (!window.confirm(`Are you sure you want to delete "${selectedPerson.fullName}"?`)) return;
    try {
      await deleteAssetPerson(selectedPerson.id);
      toast.success('Asset User ကိုဖျက်ပြီးပါပြီ။');
      setSelectedPerson(null);
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Asset User ဖျက်မရပါ။');
    }
  };

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading Asset Users...</div>;

  if (selectedPerson) {
    const employeeId = selectedPerson.employeeId;
    const visibleSelectedCount = filteredAvailableAssets.filter(a => selectedAssetIds.includes(a.id)).length;

    return <section className="space-y-5">
      <button type="button" onClick={() => { setSelectedPerson(null); setEditingName(false); }} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"><ArrowLeft size={17} /> Back to Asset Users</button>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><UserRound size={25} /></div>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') cancelEditName(); }} className="w-full max-w-sm rounded-xl border border-blue-300 px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" disabled={savingName} />
                  <button type="button" onClick={handleSaveName} disabled={savingName} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingName ? 'Saving...' : 'Save'}</button>
                  <button type="button" onClick={cancelEditName} disabled={savingName} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-slate-900">{selectedPerson.fullName}</h1>
                  {isAdmin && <button type="button" onClick={startEditName} title="Edit Asset User name" className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>}
                  {isAdmin && <button type="button" onClick={handleDeletePerson} title="Delete Asset User" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>}
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">ASSET USER</span>
                </div>
              )}
              <p className="text-sm text-slate-500">{selectedPerson.position || '-'} · {selectedPerson.department || '-'} · {selectedPerson.branch || '-'}</p>
              <p className="mt-1 text-xs text-slate-400">Employee ID: {employeeId || '-'}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-blue-50 px-5 py-3 text-center text-blue-700"><div className="text-2xl font-bold">{assignments.length}</div><div className="text-xs font-medium">Active Assets</div></div>
        </div>
      </div>

      {isAdmin && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-600" /><h2 className="font-semibold text-slate-900">Assign Assets</h2></div>
        <div className="grid gap-3 md:grid-cols-3">
          <select value={assetDepartment} onChange={e => setAssetDepartment(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">All Departments</option>{assetDepartments.map(value => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select>
          <select value={assetCategory} onChange={e => setAssetCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">All Categories</option>{assetCategories.map(value => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select>
          <select value={assetBranch} onChange={e => setAssetBranch(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">All Branches</option>{assetBranches.map(value => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select>
        </div>
        <div className="relative mt-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder="Search asset code / name / serial / brand..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-xs"><label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={filteredAvailableAssets.length > 0 && filteredAvailableAssets.every(a => selectedAssetIds.includes(a.id))} onChange={toggleVisibleAssets} /> Select visible ({filteredAvailableAssets.length})</label><span className="font-semibold text-blue-600">Selected: {selectedAssetIds.length}</span></div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {filteredAvailableAssets.map(asset => <label key={asset.id} className="flex cursor-pointer items-start gap-3 px-3.5 py-3 hover:bg-blue-50/70 transition">
              <input type="checkbox" checked={selectedAssetIds.includes(asset.id)} onChange={() => toggleAsset(asset.id)} className="mt-2 h-4 w-4 cursor-pointer rounded text-blue-600" />
              <div className="flex min-w-0 flex-1 items-start gap-3"><AssetCategoryIcon category={asset.category} model={asset.model} name={asset.name} size={16} withContainer containerSize="sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2 font-semibold text-slate-900"><span>{asset.asset_code || asset.id}</span>{asset.category && <AssetCategoryBadge category={asset.category} model={asset.model} size="sm" />}</div><div className="mt-0.5 text-xs text-slate-600">{asset.name || asset.model || '-'}</div><div className="mt-1 text-[11px] text-slate-400">{asset.serialNumber || 'No serial'} · {asset.department || '-'} · {asset.branch || '-'}</div></div></div>
            </label>)}
            {filteredAvailableAssets.length === 0 && <div className="p-8 text-center text-sm text-slate-500">ဒီ filter/search နဲ့ ကိုက်တဲ့ Available Asset မရှိပါ။</div>}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center"><input value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Notes (optional)" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><button disabled={selectedAssetIds.length === 0 || assigning} onClick={handleAssign} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{assigning ? 'Assigning...' : `Assign Selected (${selectedAssetIds.length})`}</button></div>
        {visibleSelectedCount > 0 && visibleSelectedCount !== selectedAssetIds.length && <p className="mt-2 text-xs text-slate-400">Current filter ထဲမှာ selected {visibleSelectedCount} ခု ပြနေပါတယ်။ Total selected {selectedAssetIds.length} ခုပါ။</p>}
      </div>}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Assigned Assets</h2></div>
        {detailLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading assignments...</div> : assignments.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">ဒီ Asset User ဆီမှာ Active Asset မရှိသေးပါ။</div> : <div className="divide-y divide-slate-100">
          {assignments.map(assignment => <div key={assignment.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3"><AssetCategoryIcon category={assignment.asset?.category} model={assignment.asset?.model} name={assignment.asset?.name} size={18} withContainer containerSize="md" /><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{assignment.asset?.asset_code || assignment.assetId}</span><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>{assignment.asset?.category && <AssetCategoryBadge category={assignment.asset.category} model={assignment.asset.model} size="sm" />}</div><p className="mt-1 text-sm font-medium text-slate-600">{assignment.asset?.model || assignment.asset?.name || '-'}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={13} /> Assigned {assignment.assignedDate}</p></div></div>
            {isAdmin && <div className="flex items-center gap-2">{returningId === assignment.id && <input autoFocus value={returnReason} onChange={e => setReturnReason(e.target.value)} placeholder="Return reason" className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-xs" />}<button type="button" onClick={() => handleReturn(assignment)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">{returningId === assignment.id ? 'Confirm Return' : 'Return'}</button>{returningId === assignment.id && <button type="button" onClick={() => setReturningId(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={15} /></button>}</div>}
          </div>)}
        </div>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Assignment History</h2></div>
        {history.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">History မရှိသေးပါ။</div> : <div className="divide-y divide-slate-100">{history.map(item => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><div className="flex items-center gap-3"><AssetCategoryIcon category={item.asset?.category} model={item.asset?.model} name={item.asset?.name} size={15} withContainer containerSize="sm" /><div><span className="font-medium text-slate-800">{item.asset?.asset_code || item.assetId}</span><span className="ml-2 text-slate-500">{item.asset?.model || '-'}</span></div></div><div className="text-right text-xs text-slate-400"><div>{item.assignedDate} → {item.returnDate || 'Current'}</div><div className="font-medium">{item.status}</div></div></div>)}</div>}
      </div>
    </section>;
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white"><Users className="text-blue-600" size={26} /> Assets by User</h1><p className="text-sm text-slate-500 dark:text-slate-400">Asset ပေးအပ်ထားသော ဝန်ထမ်းများကို ကြည့်ရှုပြီး Asset Assign / Return လုပ်ဆောင်နိုင်ပါသည်။</p></div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <button type="button" onClick={loadData} disabled={loading} title="Refresh list" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} /></button>
        <div className="relative flex-1 sm:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, employee ID, branch..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 shadow-sm" /></div>
        {isAdmin && <button type="button" onClick={() => setShowPersonForm(v => !v)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"><UserPlus size={16} /> Add Asset User</button>}
      </div>
    </div>

    {isAdmin && showPersonForm && <div className="space-y-4 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-semibold text-slate-900"><UserPlus size={18} className="text-blue-600" /> Add Asset User (Login အကောင့်မလိုဘဲ ဝန်ထမ်းအမည် ထည့်ရန်)</h2><div className="grid items-end gap-3.5 md:grid-cols-3">
      <div><label className="mb-1.5 ml-1 block text-xs font-medium text-slate-500">Full Name *</label><input placeholder="e.g. U Ba" value={personForm.fullName} onChange={e => setPersonForm(p => ({ ...p, fullName: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
      <div><label className="mb-1.5 ml-1 block text-xs font-medium text-slate-500">Employee ID</label><input placeholder="e.g. EMP-001" value={personForm.employeeId} onChange={e => setPersonForm(p => ({ ...p, employeeId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
      <div><label className="mb-1.5 ml-1 block text-xs font-medium text-slate-500">Position</label><input placeholder="e.g. Pharmacist / IT Officer" value={personForm.position} onChange={e => setPersonForm(p => ({ ...p, position: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
      <div><SearchableDropdown label="Department" icon={Building2} options={departmentOptions} value={personForm.department} onChange={val => setPersonForm(p => ({ ...p, department: val }))} placeholder="Select or enter Department" /></div>
      <div><SearchableDropdown label="Branch / Location" icon={MapPin} options={branchOptions} value={personForm.branch} onChange={val => setPersonForm(p => ({ ...p, branch: val }))} placeholder="Select or enter Branch" /></div>
      <div><label className="mb-1.5 ml-1 block text-xs font-medium text-slate-500">Notes</label><input placeholder="Notes (optional)" value={personForm.notes} onChange={e => setPersonForm(p => ({ ...p, notes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
    </div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowPersonForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" disabled={savingPerson} onClick={handleCreatePerson} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{savingPerson ? 'Saving...' : 'Save Asset User'}</button></div></div>}

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {visiblePeople.map(person => {
        const assignedCount = assets.filter(a => { const name = (a.assignedTo || '').trim().toLowerCase(); return name && name !== 'unassigned' && name === person.fullName.trim().toLowerCase(); }).length;
        return <button key={person.id} type="button" onClick={() => loadPersonDetail(person)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-400 hover:shadow-md">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><UserRound size={20} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate font-semibold text-slate-900 group-hover:text-blue-600">{person.fullName || 'Unnamed'}</h3><ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-blue-500" /></div><div className="mt-1 flex items-center gap-2"><p className="truncate text-xs text-slate-500">{person.position || person.employeeId || '-'}</p><span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">ASSET PERSON</span></div></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-2.5"><div className="mb-1 flex items-center gap-1 text-slate-400"><Building2 size={13} /> Department</div><div className="truncate font-medium text-slate-700">{person.department || '-'}</div></div><div className="rounded-xl bg-slate-50 p-2.5"><div className="mb-1 text-slate-400">Branch</div><div className="truncate font-medium text-slate-700">{person.branch || '-'}</div></div></div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs"><span className="flex items-center gap-1 text-slate-400"><Package size={13} /> Assigned Assets</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${assignedCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{assignedCount > 0 ? `${assignedCount} Asset${assignedCount > 1 ? 's' : ''}` : '0 Assets'}</span></div>
        </button>;
      })}
    </div>

    {visiblePeople.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">{search ? 'ရှာဖွေထားသော အချက်အလက်နှင့် ကိုက်ညီသည့် Asset User မရှိပါ။' : 'Asset Users များ မရှိသေးပါ။'}</div>}
  </section>;
}
