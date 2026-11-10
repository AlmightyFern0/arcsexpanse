export const revalidate = 30;

import PageLoader from "@/components/layout/PageLoader";
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

export default async function Home() {
  const [projects, skills] = await Promise.all([
    client.fetch(projectsQuery),
    client.fetch(skillsQuery),
  ]);

  return (
    <PageLoader startAtTop>
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
          <h2
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
          </h2>
        </div>

        <ScrollHint />
      </section>

      {/* 2 — Progettiamo mondi */}
      <ProgettiamoDivider />

      {/* 3 — Skills */}
      <section id="skills">
        <SkillsSection skills={skills} />
      </section>

      {/* 4 — Divider progetti */}
      <ProjectsDivider />

      {/* 5 — Griglia progetti */}
      <section id="progetti">
        <ProjectsGrid projects={projects} />
      </section>

      {/* 6 — Cos'altro c'è da vedere */}
      <CosaVedere />

      {/* 7 — Footer / Contatti */}
      <Footer />
    </main>
    </PageLoader>
  );
}
