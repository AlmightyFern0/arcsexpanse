"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { skillProjectHref } from "@/lib/skillProjects";

interface Skill {
  _id: string;
  title: string;
  slug: { current: string };
}

interface NavbarProps {
  skills: Skill[];
}

const MENU_TEXT = "#1e0088";

export default function Navbar({ skills }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [atFooter, setAtFooter] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Nav nascosta quando il footer fa slide-up: stessa condizione di Footer.tsx.
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const reachedBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      setAtFooter(reachedBottom);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1.2rem 2rem",
        transition: "opacity 0.3s ease",
        opacity: atFooter ? 0 : 1,
        pointerEvents: atFooter ? "none" : "auto",
      }}>
        {/* Gradiente */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: "220%",
            zIndex: 0,
            pointerEvents: "none",
            opacity: open || !scrolled ? 0 : 1,
            transition: "opacity 0.4s ease",
            background:
              "linear-gradient(to bottom, rgba(8,0,26,0.86) 0%, rgba(8,0,26,0.46) 45%, rgba(8,0,26,0) 100%)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 100%)",
          }}
        />

        <Link href="/" onClick={() => setOpen(false)} style={{ position: "relative", zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open ? "/closeMenuIcon.png" : "/XpanseIcon.png"}
            alt="Expanse"
            style={{ width: "54px", height: "37px", objectFit: "contain", transition: "opacity 0.2s ease" }}
          />
        </Link>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "8px", display: "flex", alignItems: "center",
            position: "relative", zIndex: 201,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open ? "/closeIcon.png" : "/burgermenuIcon.png"}
            alt={open ? "Chiudi menu" : "Apri menu"}
            style={{ width: "28px", height: "28px", objectFit: "contain", transition: "opacity 0.2s ease" }}
          />
        </button>
      </nav>

      {/* Full-screen overlay menu */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 199,
        background: "#00f5ff",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "all" : "none",
        transition: "opacity 0.35s ease",
        overflowY: "auto",
      }}>
        {/* Solo telefono ancorato a sinistra: da tablet in su vale la
            disposizione desktop. */}
        <style>{`
          .menu-panel {
            position: absolute;
            top: 128px;
            left: 48px;
            right: 48px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            gap: 2.5rem;
          }
          /* Da tablet in su il blocco si centra sulla propria larghezza invece
             di partire a un terzo dello schermo: con left 34% era ancorato,
             non centrato, e su iPad il margine sinistro restava piu' largo del
             destro (a 1024px: 348px contro ~296px). width max-content lo fa
             stringere sulla voce piu' lunga, ed e' questo che rende simmetrici
             i due margini; il max-width evita che sbordi quando le voci sono
             piu' larghe dello schermo. */
          @media (min-width: 768px) {
            .menu-panel {
              top: 50%;
              left: 50%;
              right: auto;
              width: max-content;
              max-width: calc(100% - 96px);
              transform: translate(-50%, -50%);
            }
          }
        `}</style>
        <div className="menu-panel">
          {/* Skills section */}
          <div>
            <p style={{
              fontSize: "16px", fontWeight: 400, color: "#000",
              marginBottom: "0.6rem",
              fontFamily: "var(--font-barlow)",
              letterSpacing: "0.3em",
            }}>
              Scopri come facciamo
            </p>
            {/* Le voci lunghe vanno a capo su mobile. Con lo spazio fra due
                voci uguale a quello fra le due righe di una voce sola non si
                capisce dove finisca l'una e cominci l'altra, quindi le due
                distanze vanno separate: righe strette dentro la voce
                (`lineHeight` sotto), spazio largo fra le voci. */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {skills.map((skill) => {
              // Senza progetto associato la voce non ha dove portare: meglio
              // toglierla che lasciarla morta.
              const href = skillProjectHref(skill.slug.current);
              if (!href) return null;
              return (
              <Link
                key={skill._id}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  fontSize: "clamp(1.3rem, 2.4vw, 2.2rem)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: MENU_TEXT,
                  textDecoration: "none",
                  lineHeight: 1.1,
                  transition: "opacity 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {skill.title}
              </Link>
              );
            })}
            </div>
          </div>

          {/* Progetti section */}
          <div>
            <p style={{
              fontSize: "16px", fontWeight: 400, color: "#000",
              marginBottom: "0.3rem",
              fontFamily: "var(--font-barlow)",
              letterSpacing: "0.3em",
            }}>
              Esplora i nostri
            </p>
            <Link
              href="/works"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                fontSize: "clamp(1.3rem, 2.4vw, 2.2rem)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: MENU_TEXT,
                textDecoration: "none",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Progetti
            </Link>
          </div>

          {/* Immersive Experience section */}
          <div>
            <p style={{
              fontSize: "16px", fontWeight: 400, color: "#000",
              marginBottom: "0.3rem",
              fontFamily: "var(--font-barlow)",
              letterSpacing: "0.3em",
            }}>
              Vivi una
            </p>
            <Link
              href="/#experience"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                fontSize: "clamp(1.3rem, 2.4vw, 2.2rem)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: MENU_TEXT,
                textDecoration: "none",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Immersive Experience
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
