import Link from "next/link";
import { Activity, MapPin, Phone, Mail, Clock } from "lucide-react";
import { clinic } from "@/lib/demo-data";

export default function Footer() {
 return <footer className="footer"><div className="container footer-grid">
  <div><Link href="/" className="brand footer-brand"><span className="brand-mark"><Activity/></span><span>NOVA<span className="brand-accent">SANTÉ</span><small>CLINIQUE & SOINS</small></span></Link><p>Une équipe à votre écoute, un accompagnement attentif à chaque étape de votre parcours de santé.</p></div>
  <div><h4>Explorer</h4><Link href="/clinique">La clinique</Link><Link href="/specialites">Nos spécialités</Link><Link href="/equipe">Notre équipe</Link><Link href="/services">Nos services</Link></div>
  <div><h4>Informations</h4><Link href="/rendez-vous">Prendre rendez-vous</Link><Link href="/contact">Nous contacter</Link><Link href="/confidentialite">Confidentialité</Link></div>
  <div><h4>Nous trouver</h4><p><MapPin/> {clinic.address}</p><p><Phone/> {clinic.phone}</p><p><Mail/> {clinic.email}</p><p><Clock/> {clinic.hours}</p></div>
 </div><div className="container footer-bottom"><span>© 2026 NovaSanté — Site de démonstration.</span><span>Les informations et identités présentées sont fictives.</span></div></footer>
}