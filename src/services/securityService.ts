import { supabase } from '../lib/supabase';
import { PasswordVaultEntry, BackupLog, CCTVRequest } from '../types';
import { cleanData } from '../utils/cleanData';

async function vaultRequest(path = '', init: RequestInit = {}) {
 const { data } = await supabase.auth.getSession();
 if (!data.session) throw new Error('Sign in required');
 const response = await fetch('/api/vault' + path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` } });
 const result = await response.json();
 if (!response.ok) throw new Error(result.error || 'Vault request failed');
 return result;
}
export const getPasswordEntries = async (): Promise<PasswordVaultEntry[]> => vaultRequest();
export const revealPasswordEntry = async (id: string): Promise<string> => (await vaultRequest('/' + encodeURIComponent(id) + '/reveal', { method: 'POST' })).value;
export const savePasswordEntry = async (entry: PasswordVaultEntry): Promise<string> => {
 const id = entry.id || crypto.randomUUID();
 await vaultRequest('/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ ...entry, password: entry.password ?? entry.value }) });
 return id;
};
export const deletePasswordEntry = async (id: string): Promise<void> => { await vaultRequest('/' + encodeURIComponent(id), { method: 'DELETE' }); };

export const fetchBackups = async (): Promise<BackupLog[]> => {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => ({ ...r, storageType: r.system, performer: r.notes })) as BackupLog[];
  } catch (error) {
    throw error;
  }
};

export const saveBackup = async (backup: Partial<BackupLog>): Promise<string | undefined> => {
  try {
    const rec = {
      id: backup.id || crypto.randomUUID(),
      ...cleanData({ date: backup.date, system: backup.storageType, status: backup.status, notes: backup.performer }),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('backups').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving backup:', error);
    throw error;
  }
};

export const fetchCCTVRequests = async (): Promise<CCTVRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('cctv_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => ({ ...r, reason: r.purpose, dateOfFootage: r.date, approvalStatus: r.status, approvedBy: r.reviewer })) as CCTVRequest[];
  } catch (error) {
    throw error;
  }
};

export const saveCCTVRequest = async (request: Partial<CCTVRequest>): Promise<string | undefined> => {
  try {
    const rec = {
      id: request.id || crypto.randomUUID(),
      ...cleanData({ requester: request.requester, purpose: request.reason, date: request.dateOfFootage, status: request.approvalStatus, reviewer: request.approvedBy }),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('cctv_requests').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving CCTV request:', error);
    throw error;
  }
};
