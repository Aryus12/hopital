import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type StaffRole = 'admin' | 'reception' | 'doctor';
export async function getStaffContext(allowed?: StaffRole[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  const { data: profile } = await supabase.from('profiles').select('id,full_name,role,specialist_id,active').eq('id', user.id).maybeSingle();
  if (!profile || !profile.active || !['admin','reception','doctor'].includes(profile.role)) redirect('/connexion?error=access');
  if (allowed && !allowed.includes(profile.role as StaffRole)) redirect('/tableau-de-bord');
  return { supabase, user, profile };
}
