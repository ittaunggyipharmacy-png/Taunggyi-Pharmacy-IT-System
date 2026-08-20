import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SystemSettings } from '../types';
import { sortDepartments } from '../utils/departmentUtils';
import { DEFAULT_SETTINGS } from '../services/firestoreService';

export interface UseDepartmentsResult {
  departments: string[];
  rawDepartments: string[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Custom React Hook providing real-time synchronization with Firestore's
 * `system_config/main` departments list.
 */
export function useDepartments(initialSettings?: SystemSettings): UseDepartmentsResult {
  const [rawDepartments, setRawDepartments] = useState<string[]>(() => {
    if (initialSettings?.departments && Array.isArray(initialSettings.departments) && initialSettings.departments.length > 0) {
      return initialSettings.departments;
    }
    return DEFAULT_SETTINGS.departments || [];
  });
  const [loading, setLoading] = useState<boolean>(!initialSettings?.departments);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const docRef = doc(db, 'system_config', 'main');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<SystemSettings>;
          if (Array.isArray(data.departments)) {
            setRawDepartments(data.departments);
          } else {
            setRawDepartments([]);
          }
        } else {
          // Document does not exist yet; fallback to default config
          setRawDepartments(DEFAULT_SETTINGS.departments || []);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!isMounted) return;
        console.error('Failed to subscribe to system_config/departments:', err);
        setError(err.message || 'Failed to load departments from Firestore.');
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [retryCount]);

  // Keep in sync if parent passed updated initialSettings
  useEffect(() => {
    if (initialSettings?.departments && Array.isArray(initialSettings.departments)) {
      setRawDepartments(initialSettings.departments);
    }
  }, [initialSettings?.departments]);

  const sortedDepartments = sortDepartments(rawDepartments);

  return {
    departments: sortedDepartments,
    rawDepartments,
    loading,
    error,
    retry
  };
}
