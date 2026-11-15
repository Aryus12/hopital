import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function bookingError(message: string) {
  if (/Trop de demandes/i.test(message)) return 'Trop de demandes depuis cette connexion. Réessayez dans quelques minutes.';
  if (/réservé|reserve|indisponible|concurrent/i.test(message)) return 'Ce créneau vient d’être pris. Choisissez une autre heure.';
  if (/hors planning|horaire pour ce spécialiste|absent/i.test(message)) return 'Ce spécialiste ne consulte pas à cette heure ou à cette date. Choisissez un autre créneau.';
  if (/date doit être future/i.test(message)) return 'La date du rendez-vous doit être ultérieure à aujourd’hui.';
  if (/Nom invalide|Téléphone invalide|E-mail invalide|Motif trop long/i.test(message)) return message;
  return 'La demande n’a pas pu être enregistrée. Vérifiez les informations et réessayez.';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const patientName = typeof body?.patient_name === 'string' ? body.patient_name.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    const specialistId = typeof body?.specialist_id === 'string' ? body.specialist_id.trim() : '';
    const appointmentDate = body?.appointment_date;
    const appointmentTime = body?.appointment_time;

    if (patientName.length < 3 || patientName.length > 120 || phone.length > 30 || phone.replace(/[^0-9+]/g, '').length < 8 ||
      (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) || reason.length > 500 ||
      !specialistId || specialistId.length > 80 || !validDate(appointmentDate) || !validTime(appointmentTime)) {
      return NextResponse.json({ error: 'Vérifiez le nom, le téléphone, l’e-mail, le spécialiste, la date et l’heure.' }, { status: 400 });
    }

    const supabase = await createClient();
    const forwarded = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown';
    const ip = forwarded.split(',')[0].trim().slice(0, 100);
    const fingerprint = createHash('sha256').update(ip).digest('hex');

    const { data, error } = await supabase.rpc('request_appointment', {
      p_patient_name: patientName,
      p_phone: phone,
      p_email: email || null,
      p_reason: reason || null,
      p_specialist_id: specialistId,
      p_appointment_date: appointmentDate,
      p_appointment_time: `${appointmentTime}:00`,
      p_client_fingerprint: fingerprint,
    });

    if (error) {
      console.error('[appointments] Supabase booking failed:', error.message);
      const message = bookingError(error.message);
      const status = /Trop de demandes/i.test(error.message) ? 429 : /réservé|reserve|indisponible/i.test(error.message) ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    const reference = data?.[0]?.reference;
    if (typeof reference !== 'string' || !reference) {
      console.error('[appointments] Booking RPC returned no reference.');
      return NextResponse.json({ error: 'La demande n’a pas reçu de référence. Veuillez réessayer.' }, { status: 502 });
    }

    return NextResponse.json({ reference, message: 'Votre demande a bien été enregistrée.' }, { status: 201 });
  } catch (error) {
    console.error('[appointments] Invalid request:', error);
    return NextResponse.json({ error: 'La requête est invalide. Vérifiez les champs et réessayez.' }, { status: 400 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role,active,specialist_id').eq('id', user.id).maybeSingle();
  if (!profile?.active || !['admin','reception','doctor'].includes(profile.role)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  let query = supabase.from('appointments').select('id,reference,patient_name,phone,email,specialist_id,specialist_name,specialty,appointment_date,appointment_time,status,created_at,reason,internal_note').order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true });
  if (profile.role === 'doctor') query = query.eq('specialist_id', profile.specialist_id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Chargement impossible.' }, { status: 500 });
  return NextResponse.json({ appointments: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role,active,specialist_id').eq('id', user.id).maybeSingle();
  if (!profile?.active || !['admin','reception','doctor'].includes(profile.role)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  const body = await request.json();
  const allowed = ['confirmed','rejected','completed','no_show','cancelled'];
  if (typeof body.reference !== 'string' || !allowed.includes(body.status)) return NextResponse.json({ error: 'Modification invalide.' }, { status: 400 });
  const update: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString(), handled_by: user.id };
  if (typeof body.internal_note === 'string') update.internal_note = body.internal_note.slice(0,1000);
  let query = supabase.from('appointments').update(update).eq('reference', body.reference);
  if (profile.role === 'doctor') query = query.eq('specialist_id', profile.specialist_id);
  const { data, error } = await query.select('reference').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Modification refusée ou rendez-vous introuvable.' }, { status: 403 });
  return NextResponse.json({ success: true });
}
