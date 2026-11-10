export const revalidate = 30;

import { client } from "@/sanity/lib/client";
import { categoriesQuery, worksProjectsQuery } from "@/sanity/queries";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/Footer";
import WorksGrid from "@/components/works/WorksGrid";
import HeroAmbientLight from "@/components/home/HeroAmbientLight";
import { contentContainer } from "@/lib/layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Progetti",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsIndexPage() {
  const [projects, categories] = await Promise.all([
    client.fetch(worksProjectsQuery),
    client.fetch(categoriesQuery),
  ]);

  return (
    <>
    <main style={{ background: "#08001a", minHeight: "100vh", color: "#fff" }}>
      <HeroAmbientLight />
      <Navbar />

      {/* `position: relative` + zIndex: per stare sopra `HeroAmbientLight`
          (fixed, zIndex 0) — senza, un blocco statico ci finirebbe comunque
          sotto per le regole di stacking CSS, a prescindere dall'ordine nel
          DOM. */}
      <section style={{ position: "relative", zIndex: 1, padding: "8rem 0 6rem" }}>
        {/* contenitore allineato al grid (3×400 + 2×32 = 1264px) */}
        <div style={contentContainer}>
          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#ffffff",
            marginBottom: "2.5rem",
          }}>
            I Nostri Progetti
          </h1>

          <WorksGrid projects={projects} categories={categories} />
        </div>
      </section>

    </main>
    {/* Fuori da <main>: e' il landmark "contentinfo". */}
    <Footer />
    </>
  );
}
