import { readRows } from './readRows';
import { supabase } from '../lib/supabase';
import { DailyLog, WeeklyLog, MonthlyLog, ActivityEntry, TaskEvidence } from '../types';
import { cleanData } from '../utils/cleanData';
const mapLog = (row: any) => row ? ({ ...row, userId: row.user_id, customTasks: row.custom_tasks, updatedAt: row.updated_at }) : null;
const logRecord = (log: any) => { const { userId, customTasks, updatedAt, ...rest } = log; return cleanData({ ...rest, user_id: userId, custom_tasks: customTasks }); };


export const saveDailyLog = async (log: Partial<DailyLog>): Promise<string | undefined> => {
  try {
    const rec = {
      id: log.id || crypto.randomUUID(),
      ...logRecord(log),
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
    return mapLog(data) as DailyLog | null;
  } catch {
    return null;
  }
};

export const fetchAllDailyLogs = async (): Promise<DailyLog[]> => {
  try {
    const data = await readRows('daily_logs', 'date');
    const error = null;
    if (error) {
      throw error;
    }
    return (data || []).map(mapLog) as DailyLog[];
  } catch (error) {
    throw error;
  }
};

export const saveWeeklyLog = async (log: Partial<WeeklyLog>): Promise<string | undefined> => {
  try {
    const rec = {
      id: log.id || crypto.randomUUID(),
      ...logRecord(log),
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
    return mapLog(data) as WeeklyLog | null;
  } catch {
    return null;
  }
};

export const saveMonthlyLog = async (log: Partial<MonthlyLog>): Promise<string | undefined> => {
  try {
    const rec = {
      id: log.id || crypto.randomUUID(),
      ...logRecord(log),
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
    return mapLog(data) as MonthlyLog | null;
  } catch {
    return null;
  }
};

export const saveActivity = async (activity: Partial<ActivityEntry>): Promise<void> => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Sign in required');
    const record = {
      user_id: auth.user.id, user_name: auth.user.email,
      id: activity.id || crypto.randomUUID(),
      ...cleanData({ action: activity.action, department: activity.department, details: activity.details }),
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
    if (error) {
      console.warn('Activities table not available or error:', error.message);
      return [];
    }
    return (data || []).map(r => ({ ...r, userId: r.user_id, userName: r.user_name })) as ActivityEntry[];
  } catch (error) {
    console.warn('Error fetching activities:', error);
    return [];
  }
};

export const saveEvidence = async (evidence: Partial<TaskEvidence>): Promise<void> => {
  try {
    const record = {
      id: evidence.id || crypto.randomUUID(),
      ...cleanData({ task_id: evidence.taskId, log_id: evidence.logId, image_url: evidence.imageUrl, timestamp: evidence.timestamp, user_id: evidence.userId, user_name: evidence.userName }),
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
    if (error) {
      console.warn('Task evidence table not available or error:', error.message);
      return [];
    }
    return (data || []).map(r => ({ ...r, taskId: r.task_id, logId: r.log_id, imageUrl: r.image_url, userId: r.user_id, userName: r.user_name })) as TaskEvidence[];
  } catch (error) {
    console.warn('Error fetching evidence:', error);
    return [];
  }
};
