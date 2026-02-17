import { supabase } from './supabase';
import type { Notification } from '../types';

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_archived', false)
    .order('date', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDbNotificationToApp);
}

export async function fetchArchivedNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_archived', true)
    .order('date', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDbNotificationToApp);
}

export async function addNotification(n: Notification): Promise<boolean> {
  const { error } = await supabase.from('notifications').insert([{
    type: n.type,
    title: n.title,
    content: n.content,
    date: n.date || new Date().toISOString(),
    is_emergency: n.isEmergency ?? false,
    emergency_status: n.emergencyStatus ?? null,
    resolved_at: n.resolvedAt ?? null,
    target_roles: n.targetRoles ?? null,
    related_id: n.relatedId ?? null,
    is_archived: false,
    created_by: n.createdBy ?? null,
  }]);
  return !error;
}

export async function archiveNotification(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_archived: true })
    .eq('id', id);
  return !error;
}

export async function updateNotificationStatus(id: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ emergency_status: status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
    .eq('id', id);
  return !error;
}

export async function updateNotification(n: Notification): Promise<boolean> {
  const { error } = await supabase.from('notifications').update({
    type: n.type,
    title: n.title,
    content: n.content,
    is_emergency: n.isEmergency ?? false,
    emergency_status: n.emergencyStatus ?? null,
  }).eq('id', n.id);
  return !error;
}

export async function deleteNotification(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);
  return !error;
}

function mapDbNotificationToApp(row: any): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    date: row.date,
    isEmergency: row.is_emergency,
    emergencyStatus: row.emergency_status,
    resolvedAt: row.resolved_at,
    targetRoles: row.target_roles,
    relatedId: row.related_id,
    createdBy: row.created_by,
  };
}
