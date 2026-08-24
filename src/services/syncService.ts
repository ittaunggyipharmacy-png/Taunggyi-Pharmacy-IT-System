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
    unsubs.push(subscribeToAssets(handlers.onAssets));
    fetchAssets().then(handlers.onAssets).catch(err => { console.error("Failed to load assets", err); if (handlers.onAssetsError) handlers.onAssetsError(err); });
  }
  if (handlers?.onPurchases) {
    unsubs.push(subscribeToPurchases(handlers.onPurchases));
    fetchPurchases().then(handlers.onPurchases);
  }
  if (handlers?.onRenewals) {
    unsubs.push(subscribeToRenewals(handlers.onRenewals));
    fetchRenewals().then(handlers.onRenewals);
  }
  if (handlers?.onPlans) {
    unsubs.push(subscribeToContentPlans(handlers.onPlans));
    fetchContentPlans().then(handlers.onPlans);
  }
  
  if (handlers?.onBackups) {
    fetchBackups().then(handlers.onBackups);
  }
  
  if (handlers?.onCCTV) {
    fetchCCTVRequests().then(handlers.onCCTV);
  }

  return () => {
    unsubs.forEach(unsub => unsub());
  };
};

export const subscribeToSupervisorFeatures = (handlers?: any) => {
  if (handlers?.onAllDailyLogs) {
    fetchAllDailyLogs().then(handlers.onAllDailyLogs);
  }
  if (handlers?.onActivities) {
    fetchActivities().then(handlers.onActivities);
  }
  if (handlers?.onEvidence) {
    fetchEvidence().then(handlers.onEvidence);
  }
  if (handlers?.onEmployees) {
    fetchEmployees().then(handlers.onEmployees);
  }
  return () => {};
};
