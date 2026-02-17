import { supabase } from './supabase';
import type { UserProfile } from '../types';

export interface AuthResult {
  success: boolean;
  error?: string;
  pending?: boolean;
}

// Sign up a new user
export async function signUp(
  email: string,
  password: string,
  meta: { fullName: string; aptNumber: number; phoneNumber: string }
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: meta.fullName,
        apt_number: meta.aptNumber,
        phone_number: meta.phoneNumber,
        role: 'RESIDENT',
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: 'email_exists' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, pending: true };
}

// Sign in with email and password
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult & { profile?: UserProfile }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: 'no_user' };
  }

  // Fetch profile from DB
  const profile = await fetchProfile(data.user.id);
  if (!profile) {
    return { success: false, error: 'profile_not_found' };
  }

  if (profile.status === 'pending') {
    // Sign out since account not yet approved
    await supabase.auth.signOut();
    return { success: false, pending: true };
  }

  return { success: true, profile };
}

// Sign out
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Fetch user profile from profiles table
export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    aptNumber: data.apt_number,
    role: data.role,
    createdAt: data.created_at,
    phoneNumber: data.phone_number,
    status: data.status,
  };
}

// Get current session user profile
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return fetchProfile(session.user.id);
}

// Update profile in Supabase
export async function updateProfile(
  userId: string,
  updates: Partial<{ full_name: string; phone_number: string; apt_number: number }>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  return !error;
}

// Change email via Supabase Auth
export async function changeEmail(newEmail: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Change password via Supabase Auth
export async function changePassword(newPassword: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Reset password via email
export async function resetPassword(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Approve pending user (admin/manager)
export async function approveUser(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', userId);
  return !error;
}

// Reject (delete) pending user
export async function rejectUser(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
  return !error;
}

// Fetch all profiles (for admin user list)
export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((d: any) => ({
    id: d.id,
    email: d.email,
    fullName: d.full_name,
    aptNumber: d.apt_number,
    role: d.role,
    createdAt: d.created_at,
    phoneNumber: d.phone_number,
    status: d.status,
  }));
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: UserProfile | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const profile = await fetchProfile(session.user.id);
      callback(profile);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
}
