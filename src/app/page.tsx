export const revalidate = 30;

import PageLoader from "@/components/layout/PageLoader";
import SkipLinks from "@/components/layout/SkipLinks";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/Footer";
import HeroCanvas from "@/components/home/HeroCanvas";
import HeroAmbientLight from "@/components/home/HeroAmbientLight";
import ProgettiamoDivider from "@/components/home/ProgettiamoDivider";
import SkillsSection from "@/components/home/SkillsSection";
import ProjectsDivider from "@/components/home/ProjectsDivider";
import ProjectsGrid from "@/components/home/ProjectsGrid";
import CosaVedere from "@/components/home/CosaVedere";
import ScrollHint from "@/components/home/ScrollHint";
import { client } from "@/sanity/lib/client";
import { projectsQuery, skillsQuery } from "@/sanity/queries";
import { contentContainer } from "@/lib/layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [projects, skills] = await Promise.all([
    client.fetch(projectsQuery),
    client.fetch(skillsQuery),
  ]);

  return (
    <PageLoader startAtTop>
    <SkipLinks links={[
      { id: "skills", label: "Skill" },
      { id: "progetti", label: "Progetti" },
      { id: "experience", label: "Esperienza" },
      { id: "contatti", label: "Contatti" },
    ]} />
    <main style={{ position: "relative" }}>
      <Navbar />
      <HeroAmbientLight />
      <HeroCanvas />

      {/* 1 — Hero */}
      <section
        id="hero-fold"
        style={{
          position: "relative",
          zIndex: 1,
          height: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          ...contentContainer,
        }}
      >

        {/* Contenuto sopra le forme */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Expanse by Arc's"
            style={{ width: "clamp(220px, 55vw, 908px)", height: "auto", objectFit: "contain", marginBottom: "clamp(48px, 12vw, 126px)" }}
          />
          {/* Unico h1 della home (audit §2): stesso aspetto, cambia solo il tag. */}
          <h1
            className="hero-title"
            style={{
              fontSize: "44px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            EXPAND BEYOND LIMITS
          </h1>
        </div>

        <ScrollHint />
      </section>

      {/* 2 — Progettiamo mondi */}
      <ProgettiamoDivider />

      {/* 3 — Skills */}
      <section id="skills" tabIndex={-1} className="skip-target" aria-label="Le nostre skill">
        <SkillsSection skills={skills} />
      </section>

      {/* 4 — Divider progetti */}
      <ProjectsDivider />

      {/* 5 — Griglia progetti */}
      <section id="progetti" tabIndex={-1} className="skip-target" aria-label="I nostri progetti">
        <ProjectsGrid projects={projects} />
      </section>

      {/* 6 — Cos'altro c'è da vedere */}
      <CosaVedere />

    </main>

      {/* 7 — Footer / Contatti. Fuori da <main>: dentro non sarebbe il
          landmark "contentinfo". E' `position: fixed`, la resa non cambia. */}
      <Footer />
    </PageLoader>
  );
}
