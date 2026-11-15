'use client';

import { useEffect, useMemo, useState } from 'react';
import { specialties, specialists } from '@/lib/demo-data';

function beninDateString() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export default function RendezVous() {
  const [specialty, setSpecialty] = useState('');
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const today = beninDateString();

  const filtered = useMemo(
    () => specialists.filter((item) => !specialty || specialty === item.specialty),
    [specialty],
  );

  useEffect(() => {
    let active = true;
    setSlots([]);
    setTime('');
    setAvailabilityError('');

    if (!doctor || !date) {
      setLoadingSlots(false);
      return () => { active = false; };
    }

    setLoadingSlots(true);
    setMessage('');
    fetch(`/api/availability?specialist=${encodeURIComponent(doctor)}&date=${encodeURIComponent(date)}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Impossible de charger les horaires.');
        return result;
      })
      .then((result) => {
        if (!active) return;
        const available = Array.isArray(result.slots)
          ? result.slots.filter((slot: unknown): slot is string => typeof slot === 'string' && /^\d{2}:\d{2}$/.test(slot))
          : [];
        setSlots(available);
        if (!available.length) setAvailabilityError('Aucun créneau disponible pour ce spécialiste à cette date. Essayez une autre date.');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAvailabilityError(error instanceof Error ? error.message : 'Impossible de charger les disponibilités. Réessayez.');
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => { active = false; };
  }, [doctor, date]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!doctor || !date || !time || !slots.includes(time)) {
      setMessage('Choisissez un spécialiste, une date et un créneau horaire disponible.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          patient_name: name,
          phone,
          email,
          reason,
          specialist_id: doctor,
          appointment_date: date,
          appointment_time: time,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible d’enregistrer la demande.');
      setReference(result.reference);
      setMessage('Votre demande a bien été enregistrée. La réception doit maintenant la vérifier et vous confirmer le rendez-vous.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">PRENDRE RENDEZ-VOUS</div>
          <h1>Choisissez le bon<br />moment pour vous.</h1>
          <p>Les créneaux proposés sont calculés à partir du planning de chaque spécialiste, des pauses, des absences et des rendez-vous déjà enregistrés. Votre demande reste en attente jusqu’à confirmation par la réception.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container form-layout">
          <aside className="info-panel">
            <div className="eyebrow eyebrow-light">COMMENT ÇA MARCHE ?</div>
            <h2>Un parcours simple, en trois étapes.</h2>
            <p>1. Choisissez votre spécialité et le professionnel souhaité.</p>
            <p>2. Sélectionnez une date pour afficher les heures réellement disponibles.</p>
            <p>3. Envoyez votre demande. La réception vous recontactera après vérification.</p>
            <div className="notice">Les spécialistes et horaires actuellement affichés sont des données fictives de démonstration. À remplacer et valider par la clinique avant la mise en service.</div>
          </aside>

          <form className="form-card" onSubmit={submit}>
            <h2>Votre demande de rendez-vous</h2>

            <div className="field">
              <label htmlFor="appointment-specialty">Spécialité</label>
              <select id="appointment-specialty" value={specialty} onChange={(event) => { setSpecialty(event.target.value); setDoctor(''); setDate(''); setMessage(''); }}>
                <option value="">Toutes les spécialités</option>
                {specialties.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </div>

            <div className="field">
              <label htmlFor="appointment-doctor">Spécialiste *</label>
              <select id="appointment-doctor" required value={doctor} onChange={(event) => { setDoctor(event.target.value); setDate(''); setMessage(''); }}>
                <option value="">Choisir un spécialiste</option>
                {filtered.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.specialty}</option>)}
              </select>
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="appointment-date">Date souhaitée *</label>
                <input id="appointment-date" type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setMessage(''); }} required disabled={!doctor} />
              </div>
              <div className="field">
                <label htmlFor="appointment-time">Heure disponible *</label>
                <select id="appointment-time" value={time} onChange={(event) => { setTime(event.target.value); setMessage(''); }} required disabled={!date || !doctor || loadingSlots || slots.length === 0}>
                  <option value="">{loadingSlots ? 'Chargement des heures…' : slots.length ? 'Choisir une heure' : 'Aucune heure disponible'}</option>
                  {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </div>
            </div>

            {doctor && date && (
              <div className={availabilityError ? 'notice' : 'success-box'} role="status" aria-live="polite">
                {loadingSlots ? 'Recherche des disponibilités…' : availabilityError || `${slots.length} créneau(x) disponible(s).`}
              </div>
            )}

            <div className="field-grid">
              <div className="field">
                <label htmlFor="appointment-name">Nom et prénom *</label>
                <input id="appointment-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={120} autoComplete="name" placeholder="Votre nom complet" />
              </div>
              <div className="field">
                <label htmlFor="appointment-phone">Téléphone *</label>
                <input id="appointment-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={8} maxLength={30} autoComplete="tel" placeholder="+229 …" />
              </div>
            </div>

            <div className="field">
              <label htmlFor="appointment-email">E-mail (facultatif)</label>
              <input id="appointment-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="vous@exemple.com" />
            </div>

            <div className="field">
              <label htmlFor="appointment-reason">Motif général (facultatif)</label>
              <textarea id="appointment-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="Indiquez brièvement le motif, sans détail médical sensible." />
            </div>

            <button className="button button-primary" type="submit" disabled={busy || !!reference || loadingSlots || !slots.includes(time)}>
              {busy ? 'Envoi en cours…' : reference ? 'Demande envoyée ✓' : 'Envoyer ma demande →'}
            </button>

            {message && (
              <div className={reference ? 'success-box' : 'notice'} role="status" aria-live="polite">
                <p>{message}</p>
                {reference && <h3>Référence : {reference}</h3>}
              </div>
            )}

            <small>En envoyant cette demande, vous acceptez d’être recontacté au sujet de ce rendez-vous. Ne transmettez pas de données médicales sensibles dans ce formulaire.</small>
          </form>
        </div>
      </section>
    </>
  );
}
