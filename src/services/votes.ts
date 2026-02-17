import { supabase } from './supabase';
import type { Vote, Ballot } from '../types';

export async function fetchVotes(): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes')
    .select('*, vote_options(id, text)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    createdBy: row.created_by,
    options: (row.vote_options || []).map((o: any) => ({ id: o.id, text: o.text })),
  }));
}

export async function addVote(v: Vote): Promise<boolean> {
  const { data, error } = await supabase.from('votes').insert([{
    title: v.title,
    description: v.description,
    type: v.type,
    start_date: v.startDate,
    end_date: v.endDate,
    created_by: v.createdBy ?? null,
  }]).select();
  if (error || !data || data.length === 0) return false;

  // Insert vote options into vote_options table
  const voteId = data[0].id;
  if (v.options && v.options.length > 0) {
    const optionRows = v.options.map(o => ({
      vote_id: voteId,
      text: o.text,
    }));
    const { error: optErr } = await supabase.from('vote_options').insert(optionRows);
    if (optErr) return false;
  }

  return true;
}

export async function fetchAllBallots(): Promise<Ballot[]> {
  const { data, error } = await supabase
    .from('ballots')
    .select('*');
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    voteId: row.vote_id,
    aptNumber: row.apt_number,
    optionIds: row.option_ids || [],
    selectedYes: row.selected_yes,
    selectedOptionId: row.selected_option_id,
    submittedAt: row.submitted_at,
    userId: row.user_id,
  }));
}

export async function fetchBallots(voteId: string): Promise<Ballot[]> {
  const { data, error } = await supabase
    .from('ballots')
    .select('*')
    .eq('vote_id', voteId);
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    voteId: row.vote_id,
    aptNumber: row.apt_number,
    optionIds: row.option_ids || [],
    selectedYes: row.selected_yes,
    selectedOptionId: row.selected_option_id,
    submittedAt: row.submitted_at,
    userId: row.user_id,
  }));
}

export async function castBallot(b: Ballot): Promise<boolean> {
  const { error } = await supabase.from('ballots').insert([{
    vote_id: b.voteId,
    apt_number: b.aptNumber,
    user_id: b.userId ?? null,
    option_ids: b.optionIds,
    selected_yes: b.selectedYes ?? null,
    selected_option_id: b.selectedOptionId ?? null,
  }]);
  return !error;
}

export async function updateVote(v: Vote): Promise<boolean> {
  const { error } = await supabase.from('votes').update({
    title: v.title,
    description: v.description,
    type: v.type,
    start_date: v.startDate,
    end_date: v.endDate,
  }).eq('id', v.id);
  if (error) return false;

  // Delete old options and re-insert
  await supabase.from('vote_options').delete().eq('vote_id', v.id);
  if (v.options && v.options.length > 0) {
    const optionRows = v.options.map(o => ({
      vote_id: v.id,
      text: o.text,
    }));
    const { error: optErr } = await supabase.from('vote_options').insert(optionRows);
    if (optErr) return false;
  }
  return true;
}

export async function deleteVote(voteId: string): Promise<boolean> {
  // Ballots and vote_options are deleted automatically via ON DELETE CASCADE
  const { error } = await supabase.from('votes').delete().eq('id', voteId);
  return !error;
}
