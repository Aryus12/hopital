import { getStaffContext } from '@/lib/auth';
import AppointmentsManager from '@/components/appointments-manager';
export const dynamic='force-dynamic';
export default async function Medecin(){const{profile}=await getStaffContext(['admin','doctor']);return <section className="content-section"><div className="container"><div className="eyebrow">ESPACE PROFESSIONNEL · MÉDECIN</div><h1 style={{fontFamily:'Manrope',color:'#12364a'}}>Mon agenda</h1><p style={{color:'#71848b'}}>Rendez-vous liés à votre spécialité{profile.specialist_id?` (${profile.specialist_id})`:''}.</p><AppointmentsManager mode="doctor"/></div></section>}
