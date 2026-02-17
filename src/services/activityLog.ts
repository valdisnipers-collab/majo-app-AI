import { supabase } from './supabase';
import type { ActivityLog } from '../types';

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    createdAt: row.created_at,
    userId: row.user_id,
  }));
}

export async function addActivityLog(log: ActivityLog): Promise<boolean> {
  const { error } = await supabase.from('activity_logs').insert([{
    type: log.type,
    message: log.message,
    user_id: log.userId ?? null,
    created_at: log.createdAt || new Date().toISOString(),
  }]);
  return !error;
}
