import { supabase } from './supabase';
import type { Meeting, AgendaItem } from '../types';

export async function fetchMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, agenda_items(*)')
    .order('date', { ascending: false });
  if (error || !data) return [];
  return data.map((m: any) => ({
    id: m.id,
    title: m.title,
    date: m.date,
    location: m.location,
    description: m.description,
    agenda: (m.agenda_items || [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((row: any) => ({
        id: row.id,
        text: row.text,
        order: row.sort_order,
      })),
  }));
}

export async function fetchAgendaItems(meetingId: string): Promise<AgendaItem[]> {
  const { data, error } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    text: row.text,
    order: row.sort_order,
  }));
}

export async function addMeeting(m: Meeting): Promise<boolean> {
  const { data, error } = await supabase.from('meetings').insert([{
    title: m.title,
    date: m.date,
    location: m.location,
    description: m.description,
  }]).select();
  if (error || !data || !data[0]) return false;

  // Batch insert agenda items
  if (m.agenda.length > 0) {
    const agendaRows = m.agenda.map((item, i) => ({
      meeting_id: data[0].id,
      text: item.text,
      sort_order: i,
    }));
    const { error: agendaErr } = await supabase.from('agenda_items').insert(agendaRows);
    if (agendaErr) return false;
  }
  return true;
}

export async function updateMeeting(m: Meeting): Promise<boolean> {
  const { error } = await supabase.from('meetings').update({
    title: m.title,
    date: m.date,
    location: m.location,
    description: m.description,
  }).eq('id', m.id);
  if (error) return false;

  // Delete old agenda items and re-insert
  await supabase.from('agenda_items').delete().eq('meeting_id', m.id);
  if (m.agenda.length > 0) {
    const agendaRows = m.agenda.map((item, i) => ({
      meeting_id: m.id,
      text: item.text,
      sort_order: i,
    }));
    const { error: agendaErr } = await supabase.from('agenda_items').insert(agendaRows);
    if (agendaErr) return false;
  }
  return true;
}

export async function deleteMeeting(meetingId: string): Promise<boolean> {
  // Agenda items cascade-delete via FK
  const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
  return !error;
}
