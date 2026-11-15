export const clinic = {
  name: "NovaSanté", tagline: "Votre santé, notre engagement.",
  address: "Quartier Zongo, Parakou, Bénin", phone: "+229 01 00 00 00 00",
  email: "contact@novasante.demo", hours: "Lun – Sam · 07h30 – 19h00"
};

export const specialties = [
  { id: "medecine-generale", name: "Médecine générale", desc: "Consultations de prévention, diagnostic et suivi de santé.", icon: "✚" },
  { id: "pediatrie", name: "Pédiatrie", desc: "Un accompagnement attentif pour la santé des enfants.", icon: "♡" },
  { id: "gynecologie", name: "Gynécologie", desc: "Santé féminine, suivi et consultations spécialisées.", icon: "✿" },
  { id: "cardiologie", name: "Cardiologie", desc: "Prévention et suivi de la santé cardiovasculaire.", icon: "♥" },
  { id: "dermatologie", name: "Dermatologie", desc: "Diagnostic et prise en charge des affections de la peau.", icon: "◉" },
  { id: "echographie", name: "Échographie", desc: "Examens d'imagerie sur rendez-vous.", icon: "⌁" }
];

export const specialists = [
  { id: "dr-amina", name: "Dr Amina S.", title: "Médecin généraliste", specialty: "Médecine générale", bio: "Consultations générales, prévention et suivi.", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=700&q=85", days: [1,2,3,4,5,6], start: "08:00", end: "12:00", duration: 30 },
  { id: "dr-marc", name: "Dr Marc K.", title: "Pédiatre", specialty: "Pédiatrie", bio: "Suivi pédiatrique et accompagnement des familles.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=700&q=85", days: [1,3,5], start: "09:00", end: "16:00", duration: 30 },
  { id: "dr-sophie", name: "Dr Sophie A.", title: "Gynécologue", specialty: "Gynécologie", bio: "Consultations de santé féminine et suivi.", image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=700&q=85", days: [2,4,6], start: "08:30", end: "15:30", duration: 30 },
  { id: "dr-david", name: "Dr David T.", title: "Cardiologue", specialty: "Cardiologie", bio: "Prévention cardiovasculaire et consultations.", image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=700&q=85", days: [2,4], start: "14:00", end: "18:00", duration: 30 }
];

// Jeu de démonstration uniquement. Les horaires devront être validés par la clinique réelle.
export function getSlots(specialistId: string, dateValue: string) {
  const doctor = specialists.find(s => s.id === specialistId);
  if (!doctor || !dateValue) return [];
  const date = new Date(`${dateValue}T12:00:00`);
  if (doctor.days.includes(date.getDay()) === false) return [];
  const [sh, sm] = doctor.start.split(":").map(Number);
  const [eh, em] = doctor.end.split(":").map(Number);
  const start = sh * 60 + sm, end = eh * 60 + em;
  const slots: string[] = [];
  for (let t = start; t + doctor.duration <= end; t += doctor.duration) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    if (!(t >= 12 * 60 && t < 13 * 60)) slots.push(`${h}:${m}`);
  }
  return slots;
}