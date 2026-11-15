import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const specialistId = searchParams.get('specialist')?.trim();
  const date = searchParams.get('date')?.trim();

  if (!specialistId || specialistId.length > 80 || !date || !isRealDate(date)) {
    return NextResponse.json({ error: 'Choisissez un spécialiste et une date valide.', slots: [] }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const supabase = await createClient();
    // One database function computes the complete availability securely. It takes
    // schedules, breaks, absences, existing bookings and Benin local time into account.
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_specialist_id: specialistId,
      p_date: date,
    });

    if (error) {
      console.error('[availability] Supabase RPC failed:', error.message);
      return NextResponse.json(
        { error: 'Les disponibilités ne peuvent pas être chargées pour le moment. Réessayez dans un instant.', slots: [] },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const slots = (data ?? [])
      .map((row: { slot_time?: string }) => row.slot_time)
      .filter((value: unknown): value is string => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value));

    return NextResponse.json({ slots }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('[availability] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue pendant la recherche des horaires.', slots: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
