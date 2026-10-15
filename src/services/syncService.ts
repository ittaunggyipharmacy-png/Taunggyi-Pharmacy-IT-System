import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { subscribeToAssets, fetchAssets } from './assetService';
import { subscribeToPurchases, fetchPurchases } from './purchaseService';
import { subscribeToRenewals, fetchRenewals } from './renewalService';
import { subscribeToContentPlans, fetchContentPlans } from './marketingService';
import { fetchBackups, fetchCCTVRequests } from './securityService';
import { fetchAllDailyLogs, fetchActivities, fetchEvidence } from './kpiService';
import { fetchEmployees } from './userService';

export const subscribeToSync = (handlers?: any) => {
  let unsubs: (() => void)[] = [];
  
  if (handlers?.onAssets) {
    // Subscription helpers now perform their own initial fetch. Keeping the
    // fetch in one place prevents duplicate callbacks and UI flicker.
    unsubs.push(subscribeToAssets(handlers.onAssets));
  }
  if (handlers?.onPurchases) {
    unsubs.push(subscribeToPurchases(handlers.onPurchases));
  }
  if (handlers?.onRenewals) {
    unsubs.push(subscribeToRenewals(handlers.onRenewals));
  }
  if (handlers?.onPlans) {
    unsubs.push(subscribeToContentPlans(handlers.onPlans));
  }
  
  if (handlers?.onBackups) {
    unsubs.push(watchTable('backups', fetchBackups, handlers.onBackups));
  }
  
  if (handlers?.onCCTV) {
    unsubs.push(watchTable('cctv_requests', fetchCCTVRequests, handlers.onCCTV));
  }

  return () => {
    unsubs.forEach(unsub => unsub());
  };
};

function watchTable(table: string, fetcher: () => Promise<any>, callback: (data: any) => void) {
 let active = true; let revision = 0;
 const refresh = async () => { const version = ++revision; try { const data = await fetcher(); if (active && version === revision) callback(data); } catch { if (active) toast.error(`Could not refresh ${table.replaceAll('_', ' ')}. Please reload.`); } };
 const channel = supabase.channel('sync-' + table).on('postgres_changes', { event: '*', schema: 'public', table }, () => { void refresh(); }).subscribe();
 void refresh();
 return () => { active = false; void supabase.removeChannel(channel); };
}
export const subscribeToSupervisorFeatures = (handlers?: any) => {
 const unsubs: (()=>void)[] = [];
 if (handlers?.onAllDailyLogs) unsubs.push(watchTable('daily_logs', fetchAllDailyLogs, handlers.onAllDailyLogs));
 if (handlers?.onActivities) unsubs.push(watchTable('activities', fetchActivities, handlers.onActivities));
 if (handlers?.onEvidence) unsubs.push(watchTable('task_evidence', fetchEvidence, handlers.onEvidence));
 if (handlers?.onEmployees) unsubs.push(watchTable('employees', fetchEmployees, handlers.onEmployees));
 return () => unsubs.forEach(stop => stop());
};
