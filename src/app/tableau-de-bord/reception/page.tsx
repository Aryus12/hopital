import { getStaffContext } from '@/lib/auth';
import AppointmentsManager from '@/components/appointments-manager';
export const dynamic='force-dynamic';
export default async function Reception(){await getStaffContext(['admin','reception']);return <section className="content-section"><div className="container"><div className="eyebrow">ESPACE PROFESSIONNEL · RÉCEPTION</div><h1 style={{fontFamily:'Manrope',color:'#12364a'}}>Gestion des rendez-vous</h1><p style={{color:'#71848b'}}>Demandes reçues, confirmations et suivi des patients.</p><AppointmentsManager mode="reception"/></div></section>}
