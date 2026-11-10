"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
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
const MENU_ID = "site-menu";
// Deve combaciare con la transizione di opacità dell'overlay.
const MENU_FADE_MS = 350;

const SECTION_LABEL_STYLE: CSSProperties = {
  fontSize: "16px", fontWeight: 400, color: "#000",
  fontFamily: "var(--font-barlow)",
  letterSpacing: "0.3em",
};

const MENU_LINK_STYLE: CSSProperties = {
  display: "block",
  fontSize: "clamp(1.3rem, 2.4vw, 2.2rem)",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: MENU_TEXT,
  textDecoration: "none",
  transition: "opacity 0.15s ease",
};

/**
 * Rende inerte tutta la pagina tranne `keep`: per ogni antenato fino a
 * `<body>`, i fratelli che non contengono nessun elemento da tenere.
 * Il menu vive dentro `<main>`, quindi non si può rendere inerte `<main>` intero.
 * Restituisce la funzione che annulla.
 */
function inertEverythingExcept(keep: HTMLElement[]): () => void {
  const touched: HTMLElement[] = [];
  const keepSet = new Set<Element>();
  for (const el of keep) {
    for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) keepSet.add(n);
  }
  for (const node of keepSet) {
    const parent = node.parentElement;
    if (!parent) continue;
    for (const sib of Array.from(parent.children)) {
      if (keepSet.has(sib) || !(sib instanceof HTMLElement)) continue;
      if (sib.tagName === "SCRIPT" || sib.tagName === "STYLE" || sib.inert) continue;
      sib.inert = true;
      touched.push(sib);
    }
  }
  return () => touched.forEach((el) => { el.inert = false; });
}

export default function Navbar({ skills }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [atFooter, setAtFooter] = useState(false);

  const barRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

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

  // Menu aperto: resto della pagina inerte (né Tab né screen reader ci
  // arrivano), focus sulla prima voce, Esc chiude e riporta il focus al
  // pulsante.
  useEffect(() => {
    if (!open) return;
    const keep = [barRef.current, overlayRef.current].filter(Boolean) as HTMLElement[];
    const restore = inertEverythingExcept(keep);

    const raf = requestAnimationFrame(() => {
      overlayRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      restore();
    };
  }, [open, close]);

  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.opacity = "0.6"),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.opacity = "1"),
  };

  return (
    <>
      {/* Barra in alto. Nascosta col footer a schermo, ma torna visibile se
          ci arriva il focus da tastiera (`.site-bar:focus-within`): niente
          elementi focalizzabili invisibili. */}
      <header
        ref={barRef}
        className={`site-bar${atFooter ? " site-bar--hidden" : ""}`}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "1.2rem 2rem",
        }}
      >
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
            alt="Expanse – home"
            style={{ width: "54px", height: "37px", objectFit: "contain", transition: "opacity 0.2s ease" }}
          />
        </Link>

        {/* Nome stabile ("Menu"), lo stato lo dice `aria-expanded`. */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls={MENU_ID}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "8px", display: "flex", alignItems: "center",
            position: "relative", zIndex: 201,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open ? "/closeIcon.png" : "/burgermenuIcon.png"}
            alt=""
            aria-hidden="true"
            style={{ width: "28px", height: "28px", objectFit: "contain", transition: "opacity 0.2s ease" }}
          />
        </button>
      </header>

      {/* Overlay a tutto schermo. Chiuso: `inert` (fuori dal Tab e dall'albero
          di accessibilità) e `visibility: hidden` a fine dissolvenza. */}
      <div
        ref={overlayRef}
        className="site-menu-overlay"
        inert={!open}
        style={{
          position: "fixed", inset: 0, zIndex: 199,
          background: "#00f5ff",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          pointerEvents: open ? "all" : "none",
          transition: open
            ? "opacity 0.35s ease, visibility 0s linear 0s"
            : `opacity 0.35s ease, visibility 0s linear ${MENU_FADE_MS}ms`,
          overflowY: "auto",
        }}
      >
        {/* Solo telefono ancorato a sinistra: da tablet in su vale la
            disposizione desktop. */}
        <style>{`
          .site-bar { transition: opacity 0.3s ease; }
          .site-bar--hidden { opacity: 0; pointer-events: none; }
          .site-bar--hidden:focus-within { opacity: 1; pointer-events: auto; }
          @media (prefers-reduced-motion: reduce) {
            .site-bar, .site-menu-overlay { transition: none !important; }
          }
          /* Focus su fondo ciano: anello blu scuro invece del bianco globale. */
          .site-menu-overlay :focus-visible {
            outline: 3px solid ${MENU_TEXT};
            outline-offset: 4px;
            box-shadow: none;
          }
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
        <nav id={MENU_ID} aria-label="Principale" className="menu-panel">
          {/* Skills section */}
          <div>
            <p style={{ ...SECTION_LABEL_STYLE, marginBottom: "0.6rem" }}>
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
                style={{ ...MENU_LINK_STYLE, lineHeight: 1.1 }}
                {...hoverHandlers}
              >
                {skill.title}
              </Link>
              );
            })}
            </div>
          </div>

          {/* Progetti section */}
          <div>
            <p style={{ ...SECTION_LABEL_STYLE, marginBottom: "0.3rem" }}>
              Esplora i nostri
            </p>
            <Link
              href="/projects"
              onClick={() => setOpen(false)}
              style={MENU_LINK_STYLE}
              {...hoverHandlers}
            >
              Progetti
            </Link>
          </div>

          {/* Immersive Experience section */}
          <div>
            <p style={{ ...SECTION_LABEL_STYLE, marginBottom: "0.3rem" }}>
              Vivi una
            </p>
            <Link
              href="/#experience"
              onClick={() => setOpen(false)}
              style={MENU_LINK_STYLE}
              {...hoverHandlers}
            >
              Immersive Experience
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
