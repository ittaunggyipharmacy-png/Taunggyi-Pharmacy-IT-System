import { supabase } from '../lib/supabase';
import { DailyLog, WeeklyLog, MonthlyLog, ActivityEntry, TaskEvidence } from '../types';
import { cleanData } from '../utils/cleanData';

export const saveDailyLog = async (log: Partial<DailyLog>): Promise<string | undefined> => {
  try {
    const rec = {
      id: log.id || crypto.randomUUID(),
      ...cleanData(log),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('daily_logs').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving daily log:', error);
    throw error;
  }
};

export const getDailyLog = async (id: string): Promise<DailyLog | null> => {
  try {
    const { data } = await supabase.from('daily_logs').select('*').eq('id', id).single();
    return (data || null) as unknown as DailyLog | null;
  } catch {
    return null;
  }
};

export const fetchAllDailyLogs = async (): Promise<DailyLog[]> => {
  try {
    const { data, error } = await supabase.from('daily_logs').select('*');
    if (error) throw error;
    return (data || []) as unknown as DailyLog[];
  } catch (error) {
    console.error('Error fetching all daily logs:', error);
    return [];
  }
};

export const saveWeeklyLog = async (log: Partial<WeeklyLog>): Promise<string | undefined> => {
  try {
    const rec = {
      id: log.id || crypto.randomUUID(),
      ...cleanData(log),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('weekly_logs').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving weekly log:', error);
    throw error;
  }
};

export const getWeeklyLog = async (id: string): Promise<WeeklyLog | null> => {
  try {
    const { data } = await supabase.from('weekly_logs').select('*').eq('id', id).single();
    return (data || null) as unknown as WeeklyLog | null;
  } catch {
    return null;
  }
};

export const saveMonthlyLog = async (log: Partial<MonthlyLog>): Promise<string | undefined> => {
  try {
    const rec = {
      id: log.id || crypto.randomUUID(),
      ...cleanData(log),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('monthly_logs').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving monthly log:', error);
    throw error;
  }
};

export const getMonthlyLog = async (id: string): Promise<MonthlyLog | null> => {
  try {
    const { data } = await supabase.from('monthly_logs').select('*').eq('id', id).single();
    return (data || null) as unknown as MonthlyLog | null;
  } catch {
    return null;
  }
};

export const saveActivity = async (activity: Partial<ActivityEntry>): Promise<void> => {
  try {
    const record = {
      id: activity.id || crypto.randomUUID(),
      ...cleanData(activity),
      timestamp: activity.timestamp || new Date().toISOString()
    };
    const { error } = await supabase.from('activities').insert(record);
    if (error) throw error;
  } catch (error) {
    console.error('Error saving activity:', error);
  }
};

export const fetchActivities = async (): Promise<ActivityEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as ActivityEntry[];
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

export const saveEvidence = async (evidence: Partial<TaskEvidence>): Promise<void> => {
  try {
    const record = {
      id: evidence.id || crypto.randomUUID(),
      ...cleanData(evidence),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('task_evidence').upsert(record);
    if (error) throw error;
  } catch (error) {
    console.error('Error saving evidence:', error);
  }
};

export const fetchEvidence = async (): Promise<TaskEvidence[]> => {
  try {
    const { data, error } = await supabase
      .from('task_evidence')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as TaskEvidence[];
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return [];
  }
};
