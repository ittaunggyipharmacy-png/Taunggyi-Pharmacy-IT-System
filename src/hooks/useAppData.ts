import { User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { DEFAULT_SYSTEM_SETTINGS } from '../config/application';
import { db } from '../services/firebase';
import {
  AccessRequest,
  BackupLog,
  ContentPlan,
  DepartmentBudget,
  EmployeeProfile,
  GoodsReceiptNote,
  InvoiceMatchRecord,
  ITAsset,
  ITTicket,
  MeetingMinute,
  PurchaseOrder,
  PurchaseRecord,
  PurchaseRequisition,
  RenewalRecord,
  Supplier,
  SystemSettings,
  SystemUser,
} from '../types';

/**
 * Listens to one Firestore collection only while a signed-in user exists.
 * Every returned record receives its Firestore document ID.
 */
function useAuthenticatedCollection<T>(
  collectionName: string,
  user: User | null,
): T[] {
  const [records, setRecords] = useState<T[]>([]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    return onSnapshot(collection(db, collectionName), (snapshot) => {
      const collectionRecords = snapshot.docs.map(
        (document) => ({ id: document.id, ...document.data() }) as T,
      );
      setRecords(collectionRecords);
    });
  }, [collectionName, user]);

  return records;
}

/**
 * Provides live application data to the main screen.
 *
 * Keeping subscriptions here makes App.tsx responsible for the user interface
 * rather than the low-level details of every Firestore collection.
 */
export function useAppData(user: User | null) {
  const assets = useAuthenticatedCollection<ITAsset>('it_assets', user);
  const tickets = useAuthenticatedCollection<ITTicket>('it_tickets', user);
  const purchases = useAuthenticatedCollection<PurchaseRecord>(
    'purchase_records',
    user,
  );
  const renewals = useAuthenticatedCollection<RenewalRecord>('renewals', user);
  const meetings = useAuthenticatedCollection<MeetingMinute>(
    'meeting_minutes',
    user,
  );
  const employees = useAuthenticatedCollection<EmployeeProfile>('employees', user);
  const contentPlans = useAuthenticatedCollection<ContentPlan>(
    'content_plans',
    user,
  );
  const backups = useAuthenticatedCollection<BackupLog>('backup_logs', user);
  const accessRequests = useAuthenticatedCollection<AccessRequest>(
    'access_requests',
    user,
  );
  const requisitions = useAuthenticatedCollection<PurchaseRequisition>(
    'purchase_requisitions',
    user,
  );
  const purchaseOrders = useAuthenticatedCollection<PurchaseOrder>(
    'purchase_orders',
    user,
  );
  const goodsReceipts = useAuthenticatedCollection<GoodsReceiptNote>(
    'goods_receipts',
    user,
  );
  const suppliers = useAuthenticatedCollection<Supplier>('suppliers', user);
  const budgets = useAuthenticatedCollection<DepartmentBudget>(
    'department_budgets',
    user,
  );
  const invoiceMatches = useAuthenticatedCollection<InvoiceMatchRecord>(
    'invoices_and_matches',
    user,
  );
  const systemUsers = useAuthenticatedCollection<SystemUser>('app_users', user);
  const [settings, setSettings] = useState<SystemSettings>(
    DEFAULT_SYSTEM_SETTINGS,
  );

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    return onSnapshot(collection(db, 'system_config'), (snapshot) => {
      const mainSettings = snapshot.docs.find(
        (document) => document.id === 'main',
      );

      if (mainSettings) {
        setSettings(mainSettings.data() as SystemSettings);
      }
    });
  }, [user]);

  return {
    assets,
    tickets,
    purchases,
    renewals,
    meetings,
    employees,
    contentPlans,
    backups,
    settings,
    setSettings,
    accessRequests,
    requisitions,
    purchaseOrders,
    goodsReceipts,
    suppliers,
    budgets,
    invoiceMatches,
    systemUsers,
  };
}
