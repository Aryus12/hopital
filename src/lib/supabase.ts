// Legacy import retained only for compatibility with older demo components.
// New authenticated operations use the request-scoped clients in ./supabase/client and ./supabase/server.
import { createClient } from './supabase/client';
export const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const supabase = typeof window !== 'undefined' && isSupabaseConfigured ? createClient() : null;
