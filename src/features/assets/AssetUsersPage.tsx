import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, ChevronRight, Package, Plus, Search, UserRound, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { SystemUser, ITAsset } from '../../types';
import { getAllSystemUsers } from '../../services/userService';
import { fetchAssets } from '../../services/assetService';
import {
  assignAssetToUser,
  getUserAssetAssignments,
  getUserAssignmentHistory,
  returnAsset,
  AssetAssignmentRecord,
} from '../../services/assetAssignmentService';

interface AssetUsersPageProps {
  currentUserId?: string;
  isAdmin: boolean;
}

export function AssetUsersPage({ currentUserId, isAdmin }: AssetUsersPageProps) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
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

  const loadUsersAndAssets = useCallback(async () => {
    setLoading(true);
    try {
      const [nextUsers, nextAssets] = await Promise.all([getAllSystemUsers(), fetchAssets()]);
      setUsers(nextUsers);
      setAssets(nextAssets);
    } catch (error) {
      console.error(error);
      toast.error('Users / Assets များကို load မလုပ်နိုင်ပါ။');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserDetail = useCallback(async (user: SystemUser) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      const [active, allHistory] = await Promise.all([
        getUserAssetAssignments(user.uid),
        getUserAssignmentHistory(user.uid),
      ]);
      setAssignments(active);
      setHistory(allHistory);
    } catch (error) {
      console.error(error);
      toast.error('Assignment information load မအောင်မြင်ပါ။');
      setAssignments([]);
      setHistory([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsersAndAssets();
  }, [loadUsersAndAssets]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.displayName, user.email, user.employeeId, user.position, user.department, user.branch, user.role]
        .some((value) => value?.toLowerCase().includes(term))
    );
  }, [users, search]);

  const assignedAssetIds = useMemo(() => new Set(assignments.map((item) => item.assetId)), [assignments]);
  const availableAssets = useMemo(() => assets.filter((asset) => {
    const status = String(asset.status || '').toLowerCase();
    return !assignedAssetIds.has(asset.id) && ['active', 'in stock', 'new'].includes(status);
  }), [assets, assignedAssetIds]);

  const handleAssign = async () => {
    if (!selectedUser || !assetToAssign) return;
    setAssigning(true);
    try {
      await assignAssetToUser({
        assetId: assetToAssign,
        userId: selectedUser.uid,
        assignedBy: currentUserId,
        notes: assignNotes.trim() || undefined,
      });
      toast.success(`${selectedUser.displayName} ဆီ Asset assign လုပ်ပြီးပါပြီ။`);
      setAssetToAssign('');
      setAssignNotes('');
      await Promise.all([loadUsersAndAssets(), loadUserDetail(selectedUser)]);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Asset assign မအောင်မြင်ပါ။');
    } finally {
      setAssigning(false);
    }
  };

  const handleReturn = async (assignment: AssetAssignmentRecord) => {
    if (!returningId) {
      setReturningId(assignment.id);
      setReturnReason('');
      return;
    }
    if (returningId !== assignment.id) return;
    try {
      await returnAsset({ assignmentId: assignment.id, returnReason: returnReason.trim() || undefined });
      toast.success('Asset return လုပ်ပြီးပါပြီ။');
      setReturningId(null);
      setReturnReason('');
      if (selectedUser) await Promise.all([loadUsersAndAssets(), loadUserDetail(selectedUser)]);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Asset return မအောင်မြင်ပါ။');
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading users and assets...</div>;
  }

  if (selectedUser) {
    return (
      <section className="space-y-5">
        <button type="button" onClick={() => setSelectedUser(null)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600">
          <ArrowLeft size={17} /> Back to Users
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {selectedUser.photoURL ? <img src={selectedUser.photoURL} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><UserRound size={25} /></div>}
              <div>
                <h1 className="text-xl font-bold text-slate-900">{selectedUser.displayName}</h1>
                <p className="text-sm text-slate-500">{selectedUser.position || selectedUser.role || '-'} · {selectedUser.department || '-'} · {selectedUser.branch || '-'}</p>
                <p className="mt-1 text-xs text-slate-400">Employee ID: {selectedUser.employeeId || '-'} · {selectedUser.email}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-blue-50 px-5 py-3 text-center text-blue-700">
              <div className="text-2xl font-bold">{assignments.length}</div>
              <div className="text-xs font-medium">Active Assets</div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-600" /><h2 className="font-semibold text-slate-900">Assign Asset</h2></div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select value={assetToAssign} onChange={(e) => setAssetToAssign(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="">Select available asset...</option>
                {availableAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.asset_code || asset.id} · {asset.category} · {asset.model}</option>)}
              </select>
              <input value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Notes (optional)" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              <button disabled={!assetToAssign || assigning} onClick={handleAssign} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{assigning ? 'Assigning...' : 'Assign'}</button>
            </div>
            {availableAssets.length === 0 && <p className="mt-3 text-xs text-amber-600">Assign လုပ်နိုင်တဲ့ Asset မရှိသေးပါ။</p>}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Assigned Assets</h2></div>
          {detailLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading assignments...</div> : assignments.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">ဒီ User ဆီမှာ Active Asset မရှိသေးပါ။</div> : (
            <div className="divide-y divide-slate-100">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><Package size={17} className="text-blue-600" /><span className="font-semibold text-slate-900">{assignment.asset?.asset_code || assignment.assetId}</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span></div>
                    <p className="mt-1 text-sm text-slate-600">{assignment.asset?.category || '-'} · {assignment.asset?.model || '-'}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={13} /> Assigned {assignment.assignedDate}</p>
                  </div>
                  {isAdmin && <div className="flex items-center gap-2">
                    {returningId === assignment.id && <input autoFocus value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Return reason" className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-xs" />}
                    <button type="button" onClick={() => handleReturn(assignment)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">{returningId === assignment.id ? 'Confirm Return' : 'Return'}</button>
                    {returningId === assignment.id && <button type="button" onClick={() => setReturningId(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={15} /></button>}
                  </div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Assignment History</h2></div>
          {history.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">History မရှိသေးပါ။</div> : <div className="divide-y divide-slate-100">{history.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><div><span className="font-medium text-slate-800">{item.asset?.asset_code || item.assetId}</span><span className="ml-2 text-slate-500">{item.asset?.model || '-'}</span></div><div className="text-right text-xs text-slate-400"><div>{item.assignedDate} → {item.returnDate || 'Current'}</div><div className="font-medium">{item.status}</div></div></div>)}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Assets by User</h1><p className="text-sm text-slate-500">User တစ်ယောက်ချင်းစီဆီ ဘာ Asset တွေ ပေးထားလဲ ကြည့်ပြီး Assign / Return လုပ်နိုင်ပါတယ်။</p></div>
        <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, employee ID, branch..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleUsers.map((user) => (
          <button key={user.uid} type="button" onClick={() => loadUserDetail(user)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <div className="flex items-start gap-3">
              {user.photoURL ? <img src={user.photoURL} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRound size={20} /></div>}
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate font-semibold text-slate-900">{user.displayName}</h3><ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" /></div><p className="truncate text-xs text-slate-500">{user.employeeId || user.email}</p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-2.5"><div className="mb-1 flex items-center gap-1 text-slate-400"><Building2 size={13} /> Department</div><div className="truncate font-medium text-slate-700">{user.department || '-'}</div></div><div className="rounded-xl bg-slate-50 p-2.5"><div className="mb-1 text-slate-400">Branch</div><div className="truncate font-medium text-slate-700">{user.branch || '-'}</div></div></div>
          </button>
        ))}
      </div>
      {visibleUsers.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">No matching users found.</div>}
    </section>
  );
}
