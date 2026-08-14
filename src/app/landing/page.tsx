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
import { getSiteUrl } from "@/lib/siteUrl";

const TITLE = "SportApp por Satorus.es · Gestión clara para clubes deportivos";
const DESCRIPTION =
  "SportApp, un producto de Satorus.es, conecta sedes, equipos, jugadores, entrenadores, sesiones y documentos para que todo el club trabaje al día.";
const SITE_URL = getSiteUrl();
const LANDING_URL = new URL("/landing", SITE_URL);
const SOCIAL_IMAGE_URL = new URL(
  "/landing/01-dashboard-redesign-2026.png",
  SITE_URL,
);

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: LANDING_URL,
  },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: LANDING_URL,
    siteName: "SportApp",
    locale: "es_ES",
    images: [
      {
        url: SOCIAL_IMAGE_URL,
        width: 1600,
        height: 1000,
        alt: "Dashboard semanal de SportApp con el estado de las sesiones",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SOCIAL_IMAGE_URL],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SportApp",
  description: DESCRIPTION,
  inLanguage: "es",
  url: LANDING_URL.href,
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <LandingNav />
      <main id="contenido-principal" className="bg-background">
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
      </main>
      <LandingFooter />
    </>
  );
}
