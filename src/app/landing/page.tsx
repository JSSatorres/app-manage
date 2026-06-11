import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { ModulesSection } from "@/components/landing/ModulesSection";
import { StarFeatureSection } from "@/components/landing/StarFeatureSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { MigrationSection } from "@/components/landing/MigrationSection";
import { RolesSection } from "@/components/landing/RolesSection";
import { VideosSection } from "@/components/landing/VideosSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const TITLE = "SportApp · Gestiona todo tu club deportivo desde una sola pantalla";
const DESCRIPTION =
  "Sedes, equipos, jugadores, entrenadores, sesiones y documentos conectados de verdad. Cuando un entrenador deja una nota, el director la ve al instante. Deja el Excel y el Drive en el pasado.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/landing/01-dashboard.png", width: 2400, height: 1500 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/landing/01-dashboard.png"],
  },
};

export default function LandingPage() {
  return (
    <main className="bg-white">
      <LandingNav />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <ModulesSection />
      <StarFeatureSection />
      <ComparisonSection />
      <MigrationSection />
      <RolesSection />
      <VideosSection />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
