import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { MultisportSection } from "@/components/landing/MultisportSection";
import { ModulesSection } from "@/components/landing/ModulesSection";
import { StarFeatureSection } from "@/components/landing/StarFeatureSection";
import { TrainingVideoSection } from "@/components/landing/TrainingVideoSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { MigrationSection } from "@/components/landing/MigrationSection";
import { RolesSection } from "@/components/landing/RolesSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const TITLE = "SportApp por Satorus.es · Gestión clara para clubes deportivos";
const DESCRIPTION =
  "SportApp, un producto de Satorus.es, conecta sedes, equipos, jugadores, entrenadores, sesiones y documentos para que todo el club trabaje al día.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/landing/01-dashboard-redesign-2026.png", width: 1600, height: 1000 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/landing/01-dashboard-redesign-2026.png"],
  },
};

export default function LandingPage() {
  return (
    <main className="bg-background">
      <LandingNav />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <MultisportSection />
      <ModulesSection />
      <StarFeatureSection />
      <TrainingVideoSection />
      <ComparisonSection />
      <MigrationSection />
      <RolesSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
