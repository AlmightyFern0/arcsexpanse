import type { Metadata } from "next";
import Link from "next/link";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/Footer";
import SkipLinks from "@/components/layout/SkipLinks";
import { DiagonalButton } from "@/components/ui/DiagonalButton";
import { contentContainer } from "@/lib/layout";

// 404 del sito (audit §8.1): risponde HTTP 404, in italiano, con le uscite.
// Lo usano sia gli URL inesistenti sia `notFound()` della pagina progetto.
export const metadata: Metadata = {
  title: "Pagina non trovata",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <SkipLinks links={[
        { id: "pagina-non-trovata", label: "Contenuto" },
        { id: "contatti", label: "Contatti" },
      ]} />
      <main style={{ background: "#08001a", minHeight: "100vh", color: "#fff" }}>
        <NavbarWrapper />
        <div id="pagina-non-trovata" tabIndex={-1} className="skip-target" style={{
          ...contentContainer,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "1.5rem",
          paddingTop: "8rem",
          paddingBottom: "6rem",
        }}>
          <p style={{
            fontFamily: "var(--font-barlow), sans-serif",
            fontSize: "16px",
            letterSpacing: "0.3em",
            color: "#00f5ff",
          }}>
            Errore 404
          </p>
          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 4rem)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            lineHeight: 1.1,
          }}>
            Pagina non trovata
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "rgba(255,255,255,0.9)", maxWidth: "36rem" }}>
            La pagina che cerchi non esiste o è stata spostata. Puoi tornare alla
            home oppure esplorare i nostri progetti.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2rem", marginTop: "1rem" }}>
            <DiagonalButton href="/projects">Vedi i progetti →</DiagonalButton>
            <Link href="/" style={{ color: "#00f5ff", textDecoration: "underline", textUnderlineOffset: "0.2em" }}>
              Torna alla home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
