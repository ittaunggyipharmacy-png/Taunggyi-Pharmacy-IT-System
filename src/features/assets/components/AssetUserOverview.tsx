import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Building2, ChevronRight, Package, Search, UserRound } from 'lucide-react';
import { SystemUser } from '../../../types';
import { getAllSystemUsers } from '../../../services/userService';
import { getUserAssetAssignments, AssetAssignmentRecord } from '../../../services/assetAssignmentService';

interface AssetUserOverviewProps {
  onUserSelect?: (user: SystemUser, assignments: AssetAssignmentRecord[]) => void;
}

export function AssetUserOverview({ onUserSelect }: AssetUserOverviewProps) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AssetAssignmentRecord[]>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const systemUsers = await getAllSystemUsers();
        if (cancelled) return;
        setUsers(systemUsers);

        const entries = await Promise.all(
          systemUsers.map(async (user) => [user.uid, await getUserAssetAssignments(user.uid)] as const)
        );
        if (!cancelled) setAssignments(Object.fromEntries(entries));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) =>
      [
        user.displayName,
        user.email,
        user.employeeId,
        user.position,
        user.department,
        user.branch,
        user.role,
      ].some((value) => value?.toLowerCase().includes(term))
    );
  }, [users, search]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading personnel asset assignments...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Assets by User</h2>
          <p className="text-sm text-slate-500">Select a user to see every active asset assigned to them.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, department, branch..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleUsers.map((user) => {
          const userAssets = assignments[user.uid] || [];

          return (
            <button
              key={user.uid}
              type="button"
              onClick={() => onUserSelect?.(user, userAssets)}
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UserRound size={20} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold text-slate-900">{user.displayName}</h3>
                    <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:text-blue-500" />
                  </div>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400"><BriefcaseBusiness size={13} /> Position</div>
                  <div className="truncate font-medium text-slate-700">{user.position || user.role || '-'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400"><Building2 size={13} /> Department</div>
                  <div className="truncate font-medium text-slate-700">{user.department || '-'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="mb-1 text-slate-400">Branch</div>
                  <div className="truncate font-medium text-slate-700">{user.branch || '-'}</div>
                </div>
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                  <div className="mb-1 flex items-center gap-1.5"><Package size={13} /> Assigned Assets</div>
                  <div className="text-lg font-bold">{userAssets.length}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {visibleUsers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          No matching users found.
        </div>
      )}
    </section>
  );
}
