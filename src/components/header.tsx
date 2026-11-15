import Link from "next/link";
import { Activity, Menu, Phone } from "lucide-react";

const links = [
  ["La clinique", "/clinique"], ["Spécialités", "/specialites"],
  ["Nos médecins", "/equipe"], ["Services", "/services"], ["Contact", "/contact"]
];

export default function Header() {
  return <header className="site-header">
    <Link href="/" className="brand"><span className="brand-mark"><Activity size={23}/></span><span>NOVA<span className="brand-accent">SANTÉ</span><small>CLINIQUE & SOINS</small></span></Link>
    <nav className="desktop-nav">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    <div className="header-actions"><Link className="phone-link" href="/connexion">Espace professionnel</Link><a className="phone-link" href="tel:+2290100000000"><Phone size={15}/> Nous appeler</a><Link className="button button-primary button-small" href="/rendez-vous">Prendre rendez-vous <span>↗</span></Link></div>
    <details className="mobile-menu"><summary><Menu/></summary><div>{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}<Link href="/rendez-vous">Prendre rendez-vous</Link><Link href="/connexion">Espace professionnel</Link></div></details>
  </header>;
}