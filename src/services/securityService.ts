import { supabase } from '../lib/supabase';
import { PasswordVaultEntry, BackupLog, CCTVRequest } from '../types';
import { cleanData } from '../utils/cleanData';

export const getPasswordEntries = async (): Promise<PasswordVaultEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('password_vault')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as PasswordVaultEntry[];
  } catch (error) {
    console.error('Error fetching password entries:', error);
    return [];
  }
};

export const savePasswordEntry = async (entry: PasswordVaultEntry): Promise<string | undefined> => {
  try {
    const record = {
      id: entry.id || crypto.randomUUID(),
      label: entry.label,
      account: entry.account,
      value: entry.value,
      branch: entry.branch,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('password_vault').upsert(record);
    if (error) throw error;
    return record.id;
  } catch (error) {
    console.error('Error saving password entry:', error);
    throw error;
  }
};

export const deletePasswordEntry = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('password_vault').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting password entry:', error);
    throw error;
  }
};

export const fetchBackups = async (): Promise<BackupLog[]> => {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as BackupLog[];
  } catch (error) {
    console.error('Error fetching backups:', error);
    return [];
  }
};

export const saveBackup = async (backup: Partial<BackupLog>): Promise<string | undefined> => {
  try {
    const rec = {
      id: backup.id || crypto.randomUUID(),
      ...cleanData(backup),
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
    return (data || []) as unknown as CCTVRequest[];
  } catch (error) {
    console.error('Error fetching CCTV requests:', error);
    return [];
  }
};

export const saveCCTVRequest = async (request: Partial<CCTVRequest>): Promise<string | undefined> => {
  try {
    const rec = {
      id: request.id || crypto.randomUUID(),
      ...cleanData(request),
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
