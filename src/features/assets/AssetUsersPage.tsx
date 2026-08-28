import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, ChevronRight, Package, Plus, Search, UserRound, X, UserPlus, Pencil, Trash2, RefreshCw, Users, UserCheck, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SystemUser, ITAsset, AssetPerson, SystemSettings } from '../../types';
import { getAllSystemUsers } from '../../services/userService';
import { fetchAssets, updateAssetAssignment } from '../../services/assetService';
import { getSettings } from '../../services/settingsService';
import { SearchableDropdown } from '../../components/SearchableDropdown';
import { assignAssetToPerson, createAssetPerson, deleteAssetPerson, getAssetPeople, getAssetPersonAssignments, getUserAssetAssignments, getUserAssignmentHistory, returnAsset, syncAssetAssignmentByName, updateAssetHolderName, AssetAssignmentRecord } from '../../services/assetAssignmentService';
import { AssetCategoryIcon, AssetCategoryBadge } from './components/AssetCategoryIcon';

type AssetHolder =
  | { kind: 'person'; person: AssetPerson }
  | { kind: 'login'; user: SystemUser };

interface AssetUsersPageProps {
  currentUserId?: string;
  isAdmin: boolean;
  settings?: SystemSettings;
}

export function AssetUsersPage({ currentUserId, isAdmin, settings: propSettings }: AssetUsersPageProps) {
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(propSettings || null);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [people, setPeople] = useState<AssetPerson[]>([]);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [selectedHolder, setSelectedHolder] = useState<AssetHolder | null>(null);
  const [assignments, setAssignments] = useState<AssetAssignmentRecord[]>([]);
  const [history, setHistory] = useState<AssetAssignmentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'people' | 'login'>('all');
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
    if (propSettings) {
      setSystemSettings(propSettings);
    } else {
      getSettings().then(res => {
        if (res) setSystemSettings(res);
      });
    }
  }, [propSettings]);

  const loadUsersAndAssets = useCallback(async () => {
    setLoading(true);
    try {
      const [nextUsers, nextPeople, nextAssets, nextSettings] = await Promise.all([
        getAllSystemUsers(),
        getAssetPeople(),
        fetchAssets(),
        !propSettings ? getSettings() : Promise.resolve(null),
      ]);
      setUsers(nextUsers);
      setPeople(nextPeople);
      setAssets(nextAssets);
      if (nextSettings) setSystemSettings(nextSettings);
    } catch (error) {
      console.error(error);
      toast.error('Asset Users / Assets များကို load မလုပ်နိုင်ပါ။');
    } finally {
      setLoading(false);
    }
  }, [propSettings]);

  const loadHolderDetail = useCallback(async (holder: AssetHolder) => {
    setSelectedHolder(holder); setDetailLoading(true); setSelectedAssetIds([]); setAssetSearch(''); setAssetDepartment(''); setAssetCategory(''); setAssetBranch('');
    try {
      const holderName = (holder.kind === 'person' ? holder.person.fullName : holder.user.displayName || '').trim().toLowerCase();
      const isSyntheticPerson = holder.kind === 'person' && holder.person.id.startsWith('auto-');

      let activeRecords: AssetAssignmentRecord[] = [];
      let allHistoryRecords: AssetAssignmentRecord[] = [];

      if (holder.kind === 'person' && !isSyntheticPerson) {
        const result = await getAssetPersonAssignments(holder.person.id, true);
        const all = result as AssetAssignmentRecord[];
        activeRecords = all.filter(a => a.status === 'Active');
        allHistoryRecords = all;
      } else if (holder.kind === 'login') {
        const [active, allHistory] = await Promise.all([
          getUserAssetAssignments(holder.user.uid),
          getUserAssignmentHistory(holder.user.uid),
        ]);
        activeRecords = active;
        allHistoryRecords = allHistory;
      }

      // Check if any asset in `assets` has `assignedTo` matching this holder, but missing from activeRecords
      const existingAssetIds = new Set(activeRecords.map(r => r.assetId));
      const matchingAssets = assets.filter(a => {
        const aName = (a.assignedTo || '').trim().toLowerCase();
        return aName && aName !== 'unassigned' && aName === holderName && !existingAssetIds.has(a.id);
      });

      if (matchingAssets.length > 0) {
        for (const a of matchingAssets) {
          const syntheticRecord: AssetAssignmentRecord = {
            id: `sync-${a.id}`,
            assetId: a.id,
            userId: holder.kind === 'login' ? holder.user.uid : holder.person.linkedUserId || null,
            assetPersonId: holder.kind === 'person' && !isSyntheticPerson ? holder.person.id : null,
            assignedDate: a.purchaseDate || new Date().toISOString().slice(0, 10),
            assignedBy: 'Asset Inventory',
            status: 'Active',
            user: holder.kind === 'login' ? {
              uid: holder.user.uid,
              employeeId: holder.user.employeeId,
              displayName: holder.user.displayName,
              email: holder.user.email,
              position: holder.user.position,
              role: holder.user.role,
              department: holder.user.department,
              branch: holder.user.branch,
              photoURL: holder.user.photoURL,
            } : null,
            assetPerson: holder.kind === 'person' ? holder.person : null,
            asset: a,
          };
          activeRecords.push(syntheticRecord);
          allHistoryRecords.push(syntheticRecord);

          // Synchronize in database so it is saved permanently
          syncAssetAssignmentByName({
            assetId: a.id,
            assignedTo: holder.kind === 'person' ? holder.person.fullName : holder.user.displayName,
            department: a.department,
            branch: a.branch || a.location,
            assignedDate: a.purchaseDate,
          }).catch(console.error);
        }
      }

      setAssignments(activeRecords);
      setHistory(allHistoryRecords);
    } catch (error) {
      console.error(error);
      toast.error('Assignment information load မအောင်မြင်ပါ။');
      setAssignments([]);
      setHistory([]);
    } finally {
      setDetailLoading(false);
    }
  }, [assets]);

  useEffect(() => { loadUsersAndAssets(); }, [loadUsersAndAssets]);

  const holders = useMemo<AssetHolder[]>(() => {
    // 1. Deduplicate people by normalized name
    const seenPeopleNames = new Set<string>();
    const uniquePeople: AssetPerson[] = [];
    people.forEach(p => {
      const norm = (p.fullName || '').trim().toLowerCase();
      if (norm && !seenPeopleNames.has(norm)) {
        seenPeopleNames.add(norm);
        uniquePeople.push(p);
      }
    });

    const peopleHolders: AssetHolder[] = uniquePeople.map(person => ({ kind: 'person', person }));
    const loginHolders: AssetHolder[] = users.map(user => ({ kind: 'login' as const, user }));

    // 2. Known names (both from registered people and login users)
    const knownNames = new Set([
      ...uniquePeople.map(p => (p.fullName || '').trim().toLowerCase()),
      ...users.map(u => (u.displayName || '').trim().toLowerCase()),
    ]);

    // 3. Virtual people from asset assignees that aren't yet in people or users
    const virtualPeople: AssetPerson[] = [];
    assets.forEach(a => {
      const raw = (a.assignedTo || '').trim();
      if (raw && raw.toLowerCase() !== 'unassigned' && !knownNames.has(raw.toLowerCase())) {
        knownNames.add(raw.toLowerCase());
        virtualPeople.push({
          id: `auto-${raw}`,
          fullName: raw,
          employeeId: undefined,
          position: undefined,
          department: a.department || undefined,
          branch: a.branch || a.location || undefined,
          status: 'Active',
        });
      }
    });

    const allPeopleHolders: AssetHolder[] = [
      ...peopleHolders,
      ...virtualPeople.map(person => ({ kind: 'person' as const, person })),
    ];

    if (filterType === 'people') {
      return allPeopleHolders;
    }
    if (filterType === 'login') {
      return loginHolders;
    }

    // 'all' -> Unify individuals so nobody appears twice
    const linkedUids = new Set(uniquePeople.map(p => p.linkedUserId).filter(Boolean));
    const peopleNameSet = new Set(allPeopleHolders.map(h => (h.kind === 'person' ? h.person.fullName : '').trim().toLowerCase()));

    // Only add login holders who aren't already represented by an AssetPerson (by linked uid or matching display name)
    const unlinkedLoginHolders: AssetHolder[] = loginHolders.filter((h): h is { kind: 'login'; user: SystemUser } => {
      if (h.kind !== 'login') return false;
      const isLinked = linkedUids.has(h.user.uid);
      const hasMatchingPersonName = peopleNameSet.has((h.user.displayName || '').trim().toLowerCase());
      return !isLinked && !hasMatchingPersonName;
    });

    return [...allPeopleHolders, ...unlinkedLoginHolders];
  }, [users, people, assets, filterType]);

  const visibleHolders = useMemo(() => {
    const term = search.trim().toLowerCase(); if (!term) return holders;
    return holders.filter(holder => {
      const values = holder.kind === 'person'
        ? [holder.person.fullName, holder.person.employeeId, holder.person.position, holder.person.department, holder.person.branch, 'asset user', 'asset person']
        : [holder.user.displayName, holder.user.email, holder.user.employeeId, holder.user.position, holder.user.department, holder.user.branch, holder.user.role, 'login user'];
      return values.some(value => value?.toLowerCase().includes(term));
    });
  }, [holders, search]);

  const departmentOptions = useMemo(() => {
    const settingsDepts = systemSettings?.departments || [];
    const fromPeople = people.map(p => p.department).filter(Boolean);
    const fromUsers = users.map(u => u.department).filter(Boolean);
    const fromAssets = assets.map(a => a.department).filter(Boolean);
    const all = Array.from(new Set([...settingsDepts, ...fromPeople, ...fromUsers, ...fromAssets].map(s => String(s).trim()).filter(Boolean)));
    return all.sort((a, b) => a.localeCompare(b));
  }, [systemSettings, people, users, assets]);

  const branchOptions = useMemo(() => {
    const settingsLocs = systemSettings?.locations || [];
    const settingsBranches = systemSettings?.branchNotes?.map(b => b.name) || [];
    const fromPeople = people.map(p => p.branch).filter(Boolean);
    const fromUsers = users.map(u => u.branch).filter(Boolean);
    const fromAssets = assets.map(a => a.branch || a.location).filter(Boolean);
    const all = Array.from(new Set([...settingsLocs, ...settingsBranches, ...fromPeople, ...fromUsers, ...fromAssets].map(s => String(s).trim()).filter(Boolean)));
    return all.sort((a, b) => a.localeCompare(b));
  }, [systemSettings, people, users, assets]);

  const assignedAssetIds = useMemo(() => new Set(assignments.map(item => item.assetId)), [assignments]);
  const availableAssets = useMemo(() => assets.filter(asset => {
    if (asset.isPurged) return false;
    const status = String(asset.status || '').toLowerCase();
    const isUnassigned = !asset.assignedTo || asset.assignedTo === 'Unassigned';
    return !assignedAssetIds.has(asset.id) && ['active', 'in stock', 'new'].includes(status) && isUnassigned;
  }), [assets, assignedAssetIds]);

  const assetDepartments = useMemo(() => Array.from(new Set(availableAssets.map(a => a.department).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b))), [availableAssets]);
  const assetCategories = useMemo(() => Array.from(new Set(availableAssets.map(a => a.category).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b))), [availableAssets]);
  const assetBranches = useMemo(() => Array.from(new Set(availableAssets.map(a => a.branch).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b))), [availableAssets]);

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

  const toggleAsset = (assetId: string) => setSelectedAssetIds(prev => prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]);
  const toggleVisibleAssets = () => {
    const visibleIds = filteredAvailableAssets.map(a => a.id);
    setSelectedAssetIds(prev => {
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => prev.includes(id));
      return allSelected ? prev.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...prev, ...visibleIds]));
    });
  };

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
    if (!selectedHolder || selectedAssetIds.length === 0) return;
    setAssigning(true);
    try {
      let targetPersonId = selectedHolder.kind === 'person' ? selectedHolder.person.id : '';

      // If synthetic person or login user, ensure asset_person exists in DB
      if (selectedHolder.kind === 'person' && selectedHolder.person.id.startsWith('auto-')) {
        const created = await createAssetPerson({
          fullName: selectedHolder.person.fullName,
          department: selectedHolder.person.department || null,
          branch: selectedHolder.person.branch || null,
          status: 'Active',
          linkedUserId: null,
        });
        targetPersonId = created.id;
      }

      if (selectedHolder.kind === 'person') {
        const effectiveId = targetPersonId || selectedHolder.person.id;
        await Promise.all(selectedAssetIds.map(assetId => assignAssetToPerson({ assetId, assetPersonId: effectiveId, assignedBy: currentUserId, notes: assignNotes.trim() || undefined })));
        toast.success(`${selectedAssetIds.length} Asset ကို ${selectedHolder.person.fullName} ဆီ assign လုပ်ပြီးပါပြီ။`);
      } else {
        // Login user
        const currentName = selectedHolder.user.displayName || 'Unknown';
        await Promise.all(selectedAssetIds.map(assetId => syncAssetAssignmentByName({
          assetId,
          assignedTo: currentName,
          department: selectedHolder.user.department,
          branch: selectedHolder.user.branch,
          assignedBy: currentUserId,
        })));
        toast.success(`${selectedAssetIds.length} Asset ကို ${currentName} ဆီ assign လုပ်ပြီးပါပြီ။`);
      }

      setSelectedAssetIds([]); setAssignNotes('');
      await Promise.all([loadUsersAndAssets(), loadHolderDetail(selectedHolder)]);
    } catch (error: any) { console.error(error); toast.error(error?.message || 'Asset assign မအောင်မြင်ပါ။'); }
    finally { setAssigning(false); }
  };

  const handleReturn = async (assignment: AssetAssignmentRecord) => {
    if (!returningId) { setReturningId(assignment.id); setReturnReason(''); return; }
    if (returningId !== assignment.id) return;
    try {
      if (assignment.id.startsWith('sync-')) {
        await updateAssetAssignment(
          assignment.assetId,
          'Unassigned',
          assignment.asset?.location || 'Central Storage',
          assignment.asset?.department || '',
          assignment.asset?.status || 'Active'
        );
        await syncAssetAssignmentByName({
          assetId: assignment.assetId,
          assignedTo: 'Unassigned',
        });
      } else {
        await returnAsset({ assignmentId: assignment.id, returnReason: returnReason.trim() || undefined });
      }
      toast.success('Asset return လုပ်ပြီးပါပြီ။');
      setReturningId(null);
      setReturnReason('');
      if (selectedHolder) {
        await Promise.all([loadUsersAndAssets(), loadHolderDetail(selectedHolder)]);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Asset return မအောင်မြင်ပါ။');
    }
  };

  const handleDeletePerson = async () => {
    if (!selectedHolder || selectedHolder.kind !== 'person') return;
    
    // Check if they have active assignments
    if (assignments.length > 0) {
      toast.error('This user has active assigned assets. Please return or reassign them first.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the user "${selectedHolder.person.fullName}"? This action cannot be undone.`)) return;

    try {
      await deleteAssetPerson(selectedHolder.person.id);
      toast.success('Asset user has been deleted.');
      setSelectedHolder(null);
      await loadUsersAndAssets();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to delete asset user.');
    }
  };

  const holderName = selectedHolder?.kind === 'person' ? selectedHolder.person.fullName : selectedHolder?.user.displayName || '';

  const totalPeopleCount = useMemo(() => {
    const names = new Set(people.map(p => (p.fullName || '').trim().toLowerCase()).filter(Boolean));
    return names.size;
  }, [people]);
  const totalLoginCount = users.length;
  const totalDisplayCount = holders.length;

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading asset users and assets...</div>;

  if (selectedHolder) {
    const employeeId = selectedHolder.kind === 'person' ? selectedHolder.person.employeeId : selectedHolder.user.employeeId;
    const position = selectedHolder.kind === 'person' ? selectedHolder.person.position : (selectedHolder.user.position || selectedHolder.user.role);
    const department = selectedHolder.kind === 'person' ? selectedHolder.person.department : selectedHolder.user.department;
    const branch = selectedHolder.kind === 'person' ? selectedHolder.person.branch : selectedHolder.user.branch;
    const isAssetPerson = selectedHolder.kind === 'person';
    const visibleSelectedCount = filteredAvailableAssets.filter(a => selectedAssetIds.includes(a.id)).length;

    return <section className="space-y-5">
      <button type="button" onClick={() => { setSelectedHolder(null); setEditingName(false); }} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"><ArrowLeft size={17} /> Back to Asset Users</button>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><UserRound size={25} /></div><div className="min-w-0 flex-1">
            {editingName ? <div className="flex flex-wrap items-center gap-2"><input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') cancelEditName(); }} className="w-full max-w-sm rounded-xl border border-blue-300 px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" disabled={savingName} /><button type="button" onClick={handleSaveName} disabled={savingName} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingName ? 'Saving...' : 'Save'}</button><button type="button" onClick={cancelEditName} disabled={savingName} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button></div> : <div className="flex items-center gap-2"><h1 className="truncate text-xl font-bold text-slate-900">{holderName}</h1>{isAdmin && <button type="button" onClick={startEditName} title="Edit user name" className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>}{isAdmin && isAssetPerson && <button type="button" onClick={handleDeletePerson} title="Delete user" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>}<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{isAssetPerson ? 'ASSET USER' : 'LOGIN USER'}</span></div>}
            <p className="text-sm text-slate-500">{position || '-'} · {department || '-'} · {branch || '-'}</p><p className="mt-1 text-xs text-slate-400">Employee ID: {employeeId || '-'}{selectedHolder.kind === 'login' ? ` · ${selectedHolder.user.email}` : ''}</p>
          </div></div>
          <div className="rounded-2xl bg-blue-50 px-5 py-3 text-center text-blue-700"><div className="text-2xl font-bold">{assignments.length}</div><div className="text-xs font-medium">Active Assets</div></div>
        </div>
      </div>

      {isAdmin && isAssetPerson && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-600" /><h2 className="font-semibold text-slate-900">Assign Assets</h2></div>
        <div className="grid gap-3 md:grid-cols-3">
          <select value={assetDepartment} onChange={e => setAssetDepartment(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">All Departments</option>{assetDepartments.map(value => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select>
          <select value={assetCategory} onChange={e => setAssetCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">All Categories</option>{assetCategories.map(value => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select>
          <select value={assetBranch} onChange={e => setAssetBranch(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">All Branches</option>{assetBranches.map(value => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select>
        </div>
        <div className="relative mt-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder="Search asset code / name / serial / brand..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-xs"><label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={filteredAvailableAssets.length > 0 && filteredAvailableAssets.every(a => selectedAssetIds.includes(a.id))} onChange={toggleVisibleAssets} /> Select visible ({filteredAvailableAssets.length})</label><span className="font-semibold text-blue-600">Selected: {selectedAssetIds.length}</span></div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {filteredAvailableAssets.map(asset => (
              <label key={asset.id} className="flex cursor-pointer items-start gap-3 px-3.5 py-3 hover:bg-blue-50/70 dark:hover:bg-slate-800/60 transition">
                <input
                  type="checkbox"
                  checked={selectedAssetIds.includes(asset.id)}
                  onChange={() => toggleAsset(asset.id)}
                  className="mt-2 w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
                <div className="min-w-0 flex items-start gap-3 flex-1">
                  <AssetCategoryIcon
                    category={asset.category}
                    model={asset.model}
                    name={asset.name}
                    size={16}
                    withContainer
                    containerSize="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{asset.asset_code || asset.id}</span>
                      {asset.category && (
                        <AssetCategoryBadge category={asset.category} model={asset.model} size="sm" />
                      )}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {asset.name || asset.model || '-'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {asset.serialNumber || 'No serial'} · {asset.department || '-'} · {asset.branch || '-'}
                    </div>
                  </div>
                </div>
              </label>
            ))}
            {filteredAvailableAssets.length === 0 && <div className="p-8 text-center text-sm text-slate-500">ဒီ filter/search နဲ့ ကိုက်တဲ့ Available Asset မရှိပါ။</div>}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center"><input value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Notes (optional)" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><button disabled={selectedAssetIds.length === 0 || assigning} onClick={handleAssign} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{assigning ? 'Assigning...' : `Assign Selected (${selectedAssetIds.length})`}</button></div>
        {visibleSelectedCount > 0 && visibleSelectedCount !== selectedAssetIds.length && <p className="mt-2 text-xs text-slate-400">Current filter ထဲမှာ selected {visibleSelectedCount} ခု ပြနေပါတယ်။ Total selected {selectedAssetIds.length} ခုပါ။</p>}
        {availableAssets.length === 0 && <p className="mt-3 text-xs text-amber-600">Assign လုပ်နိုင်တဲ့ unassigned Asset မရှိသေးပါ။</p>}
      </div>}

      {!isAssetPerson && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">ဒီ Login User ကို Asset User အဖြစ် automatically link လုပ်နိုင်တဲ့ workflow ပါပြီးသားပါ။ User name ကို ဒီနေရာက edit လုပ်ရင် login account name နဲ့ assigned asset records တွေပါ sync ဖြစ်ပါတယ်။</div>}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Assigned Assets</h2>
        </div>
        {detailLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">ဒီ User ဆီမှာ Active Asset မရှိသေးပါ။</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map(assignment => (
              <div key={assignment.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <AssetCategoryIcon
                    category={assignment.asset?.category}
                    model={assignment.asset?.model}
                    name={assignment.asset?.name}
                    size={18}
                    withContainer
                    containerSize="md"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-white">{assignment.asset?.asset_code || assignment.assetId}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">Active</span>
                      {assignment.asset?.category && (
                        <AssetCategoryBadge category={assignment.asset.category} model={assignment.asset.model} size="sm" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {assignment.asset?.model || assignment.asset?.name || '-'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <CalendarDays size={13} /> Assigned {assignment.assignedDate}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    {returningId === assignment.id && (
                      <input
                        autoFocus
                        value={returnReason}
                        onChange={e => setReturnReason(e.target.value)}
                        placeholder="Return reason"
                        className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleReturn(assignment)}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      {returningId === assignment.id ? 'Confirm Return' : 'Return'}
                    </button>
                    {returningId === assignment.id && (
                      <button
                        type="button"
                        onClick={() => setReturningId(null)}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Assignment History</h2>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">History မရှိသေးပါ။</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <AssetCategoryIcon
                    category={item.asset?.category}
                    model={item.asset?.model}
                    name={item.asset?.name}
                    size={15}
                    withContainer
                    containerSize="sm"
                  />
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.asset?.asset_code || item.assetId}</span>
                    <span className="ml-2 text-slate-500">{item.asset?.model || '-'}</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{item.assignedDate} → {item.returnDate || 'Current'}</div>
                  <div className="font-medium">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-blue-600" size={26} />
            Assets by User
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Login User များနှင့် Asset People ဝန်ထမ်းအားလုံးကို ကြည့်ရှုပြီး Asset Assign / Return လုပ်ဆောင်နိုင်ပါသည်။
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => loadUsersAndAssets()}
            disabled={loading}
            title="Refresh list"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, employee ID, branch..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
          <select 
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm"
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          >
            <option value="">All Departments</option>
            {departmentOptions.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowPersonForm(v => !v)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
            >
              <UserPlus size={16} /> Add Asset User
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filterType === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All Users ({totalDisplayCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('people')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filterType === 'people'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Asset People ({totalPeopleCount})
        </button>
      </div>

      {isAdmin && showPersonForm && (
        <div className="rounded-3xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            Add Asset User (Login အကောင့်မလိုဘဲ ဝန်ထမ်းအမည် ထည့်ရန်)
          </h2>
          <div className="grid gap-3.5 md:grid-cols-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Full Name *</label>
              <input
                placeholder="e.g. U Ba"
                value={personForm.fullName}
                onChange={e => setPersonForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Employee ID</label>
              <input
                placeholder="e.g. EMP-001"
                value={personForm.employeeId}
                onChange={e => setPersonForm(p => ({ ...p, employeeId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Position</label>
              <input
                placeholder="e.g. Pharmacist / IT Officer"
                value={personForm.position}
                onChange={e => setPersonForm(p => ({ ...p, position: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <SearchableDropdown
                label="Department"
                icon={Building2}
                options={departmentOptions}
                value={personForm.department}
                onChange={val => setPersonForm(p => ({ ...p, department: val }))}
                placeholder="Select or enter Department"
              />
            </div>
            <div>
              <SearchableDropdown
                label="Branch / Location"
                icon={MapPin}
                options={branchOptions}
                value={personForm.branch}
                onChange={val => setPersonForm(p => ({ ...p, branch: val }))}
                placeholder="Select or enter Branch"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Notes</label>
              <input
                placeholder="Notes (optional)"
                value={personForm.notes}
                onChange={e => setPersonForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPersonForm(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingPerson}
              onClick={handleCreatePerson}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {savingPerson ? 'Saving...' : 'Save Asset User'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleHolders.map(holder => {
          const name = holder.kind === 'person' ? holder.person.fullName : holder.user.displayName;
          const employeeId = holder.kind === 'person' ? holder.person.employeeId : holder.user.employeeId;
          const position = holder.kind === 'person' ? holder.person.position : (holder.user.position || holder.user.role);
          const department = holder.kind === 'person' ? holder.person.department : holder.user.department;
          const branch = holder.kind === 'person' ? holder.person.branch : holder.user.branch;
          const isPerson = holder.kind === 'person';

          return (
            <button
              key={`${holder.kind}-${holder.kind === 'person' ? holder.person.id : holder.user.uid}`}
              type="button"
              onClick={() => loadHolderDetail(holder)}
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left shadow-sm transition-all hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${isPerson ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
                  <UserRound size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {name || 'Unnamed'}
                    </h3>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{position || employeeId || '-'}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase shrink-0 ${
                      isPerson
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    }`}>
                      {isPerson ? 'ASSET PERSON' : 'LOGIN USER'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                  <div className="mb-1 flex items-center gap-1 text-slate-400">
                    <Building2 size={13} /> Department
                  </div>
                  <div className="truncate font-medium text-slate-700 dark:text-slate-200">{department || '-'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                  <div className="mb-1 text-slate-400">Branch</div>
                  <div className="truncate font-medium text-slate-700 dark:text-slate-200">{branch || '-'}</div>
                </div>
              </div>

              {(() => {
                const assignedCount = assets.filter(a => {
                  const aName = (a.assignedTo || '').trim().toLowerCase();
                  return aName && aName !== 'unassigned' && aName === (name || '').trim().toLowerCase();
                }).length;

                return (
                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Package size={13} /> Assigned Assets
                    </span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                      assignedCount > 0
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {assignedCount > 0 ? `${assignedCount} Asset${assignedCount > 1 ? 's' : ''}` : '0 Assets'}
                    </span>
                  </div>
                );
              })()}
            </button>
          );
        })}
      </div>

      {visibleHolders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          {search ? 'ရှာဖွေထားသော အမည်/အချက်အလက်နှင့် ကိုက်ညီသည့် User မရှိပါ။' : 'Asset Users များ မရှိသေးပါ။'}
        </div>
      )}
    </section>
  );
}
