'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Connexion() {
  const router = useRouter();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('error')==='access')setError('Ce compte ne dispose pas des droits d’accès à l’espace professionnel.');},[]);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setError('Identifiants incorrects ou compte non activé.');setBusy(false);return;}router.replace('/tableau-de-bord');router.refresh();}
  return <section className="content-section"><div className="container" style={{maxWidth:520}}><div className="form-card"><div className="eyebrow">ESPACE PROFESSIONNEL SÉCURISÉ</div><h1 style={{fontFamily:'Manrope',color:'#12364a'}}>Connexion</h1><p style={{color:'#71848b',lineHeight:1.7}}>Accès réservé au personnel autorisé de la clinique.</p><form onSubmit={submit}><div className="field"><label>Adresse e-mail</label><input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} /></div><div className="field"><label>Mot de passe</label><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></div>{error&&<div className="notice" role="alert">{error}</div>}<button className="button button-primary" disabled={busy}>{busy?'Connexion…':'Se connecter →'}</button></form><p style={{fontSize:12,marginTop:20}}><Link href="/mot-de-passe" style={{color:'#087f83'}}>Mot de passe oublié ?</Link></p><p style={{fontSize:11,color:'#819199',lineHeight:1.6}}>Les comptes professionnels sont créés par l’administrateur. L’inscription publique est désactivée.</p></div></div></section>
}
