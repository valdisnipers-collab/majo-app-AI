import { supabase } from './supabase';
import type { MaintenanceTopic, MaintenanceComment } from '../types';

export async function fetchMaintenanceTopics(): Promise<MaintenanceTopic[]> {
  const { data, error } = await supabase
    .from('maintenance_topics')
    .select('*, maintenance_comments(*)')
    .order('date', { ascending: false });
  if (error || !data) return [];
  return data.map((t: any) => ({
    id: t.id,
    category: t.category,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    rejectionReason: t.rejection_reason,
    authorId: t.author_id,
    authorName: t.author_name,
    aptNumber: t.apt_number,
    date: t.date,
    images: t.images,
    statusChangedAt: t.status_changed_at,
    comments: (t.maintenance_comments || [])
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        userName: c.user_name,
        text: c.text,
        date: c.date,
      })),
  }));
}

export async function fetchMaintenanceComments(topicId: string): Promise<MaintenanceComment[]> {
  const { data, error } = await supabase
    .from('maintenance_comments')
    .select('*')
    .eq('topic_id', topicId)
    .order('date', { ascending: true });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    text: row.text,
    date: row.date,
  }));
}

export async function addMaintenanceTopic(t: MaintenanceTopic): Promise<boolean> {
  const { data, error } = await supabase.from('maintenance_topics').insert([{
    category: t.category,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    rejection_reason: t.rejectionReason,
    author_id: t.authorId,
    author_name: t.authorName,
    apt_number: t.aptNumber,
    images: t.images,
    date: t.date || new Date().toISOString(),
  }]).select();
  return !error && !!data;
}

export async function addMaintenanceComment(topicId: string, comment: MaintenanceComment): Promise<boolean> {
  const { error } = await supabase.from('maintenance_comments').insert([{
    topic_id: topicId,
    user_id: comment.userId,
    user_name: comment.userName,
    text: comment.text,
    date: comment.date || new Date().toISOString(),
  }]);
  return !error;
}

export async function updateMaintenanceStatus(id: string, status: string, rejectionReason?: string): Promise<boolean> {
  const updates: Record<string, any> = { status, rejection_reason: rejectionReason };
  // Track when status changes to RESOLVED or REJECTED (for 24h archive logic)
  if (status === 'RESOLVED' || status === 'REJECTED') {
    updates.status_changed_at = new Date().toISOString();
  } else {
    updates.status_changed_at = null; // reset if moved back to NEW/APPROVED
  }
  const { error } = await supabase
    .from('maintenance_topics')
    .update(updates)
    .eq('id', id);
  return !error;
}

export async function updateMaintenanceTopic(t: MaintenanceTopic): Promise<boolean> {
  const { error } = await supabase
    .from('maintenance_topics')
    .update({
      category: t.category,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      rejection_reason: t.rejectionReason,
      images: t.images,
      status_changed_at: (t.status === 'RESOLVED' || t.status === 'REJECTED') ? (t.statusChangedAt || new Date().toISOString()) : null,
    })
    .eq('id', t.id);
  return !error;
}

export async function deleteMaintenanceTopic(id: string): Promise<boolean> {
  // Comments are deleted automatically via ON DELETE CASCADE
  const { error } = await supabase.from('maintenance_topics').delete().eq('id', id);
  return !error;
}
