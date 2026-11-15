import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "NovaSanté — Clinique & soins à Parakou",
  description: "Découvrez nos spécialités, notre équipe et demandez un rendez-vous auprès du spécialiste de votre choix."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="fr"><body><Header/><main>{children}</main><Footer/></body></html>;
}