"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FooterArtworkSvg, { ARTWORK_SLOT } from "@/components/footer/FooterArtwork";
import { EMAIL_ARTWORK, FORM_ARTWORK } from "@/components/footer/footerArtworkData";
import { useCenteredSlot } from "@/hooks/useCenteredSlot";
import { useIsMobile } from "@/hooks/useIsMobile";

const ARCS_SITE_URL      = "https://www.arcs-design.com/";
const PRIVACY_POLICY_URL = "https://www.arcs-design.com/en/3/privacy-policy/";
const COOKIE_POLICY_URL  = "https://www.arcs-design.com/en/51/cookie-policy/";

const contacts = [
  {
    id: "email",
    href: "mailto:info@arcs.studio",
    label: "Scrivici una mail",
    artwork: EMAIL_ARTWORK,
  },
  {
    id: "form",
    href: "/contact",
    label: "Raccontaci il tuo progetto\nattraverso il form",
    artwork: FORM_ARTWORK,
  },
];

// Tipografia del footer: Figma, 16px @1920 e 12px @390.
const BODY_SIZE = { desktop: "16px", mobile: "12px" };
const BODY_LH = 1.2;
const LABEL_LS = "0.3em";

// Distanza fra i due blocchi di contatto su desktop: Figma, 467px @1920.
const CONTACTS_GAP = "clamp(2rem, 24.3vw, 467px)";

// Scroll su cui si distribuisce lo slide-up.
const FOOTER_REVEAL_PX = 400;

// Frazione di corsa oltre la quale il footer accetta mouse e click.
const FOOTER_INTERACTIVE_AT = 0.92;

// Vuoto fra la fine del contenuto e l'inizio dello slide-up.
const FOOTER_BREATH = "50svh";

export default function Footer() {
  const [revealed, setRevealed] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  const isMobile = useIsMobile();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const slotEls = useRef(new Map<string, HTMLElement>());
  const registerSlot = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) slotEls.current.set(key, el);
      else slotEls.current.delete(key);
    },
    []
  );

  useCenteredSlot(slotEls, isMobile, setHoveredId);

  useEffect(() => {
    let raf = 0;

    let gapStart = 0;
    const measure = () => {
      gapStart = document.documentElement.scrollHeight - FOOTER_REVEAL_PX;
    };

    const check = () => {
      raf = 0;
      const raw = gapStart > 0 ? (window.scrollY + window.innerHeight - gapStart) / FOOTER_REVEAL_PX : 0;
      const progress = Math.min(1, Math.max(0, raw));

      const el = footerRef.current;
      if (el) el.style.transform = `translateY(${(1 - progress) * 100}%)`;

      setRevealed(progress >= FOOTER_INTERACTIVE_AT);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(check);
    };
    const onResize = () => { measure(); onScroll(); };

    measure();
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      {/* Corsa dello slide-up */}
      <div style={{ height: `calc(${FOOTER_BREATH} + ${FOOTER_REVEAL_PX}px)` }} />

      <footer
      ref={footerRef}
      id="contatti"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 150,
        background: "#4419AE",
        height: "100svh",
        overflowY: "hidden",
        pointerEvents: revealed ? "auto" : "none",
        display: "flex",
        flexDirection: "column",
        padding: "2.5rem 4vw 2.5rem",
        // Posizione iniziale; da qui in poi la scrive il loop di scroll.
        transform: "translateY(100%)",
        willChange: "transform",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Expanse by Arc's"
        style={{ height: 38, width: "auto", objectFit: "contain", alignSelf: "flex-start" }}
      />

      {/* Titolo e contatti */}
      <div style={{
        flex: 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(1rem, 4svh, 3rem)",
        padding: "clamp(0.5rem, 3svh, 4rem) 0",
        minHeight: 0,
      }}>
        <h2 style={{
          textAlign: "center",
          // Figma: 62px @1920, 32px @390.
          fontSize: "clamp(2rem, 5vw, 3.875rem)",
          fontWeight: 700,
          lineHeight: 1.276,
          textTransform: "uppercase",
          color: "#00f5ff",
        }}>
          GOT SOMETHING IN MIND?
        </h2>

        <div style={{
          position: "relative",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "clamp(1.25rem, 3.5svh, 2.5rem)" : CONTACTS_GAP,
          justifyContent: "center",
          alignItems: "stretch",
          width: isMobile ? "100%" : undefined,
          flexWrap: "nowrap",
        }}>
          {contacts.map((c, i) => (
            <a
              key={c.id}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                // Su mobile icona ed etichetta affiancate, con il lato che si
                // alterna fra le due righe.
                flexDirection: isMobile ? (i % 2 === 0 ? "row-reverse" : "row") : "column",
                alignItems: "center",
                justifyContent: isMobile ? "center" : "flex-end",
                gap: isMobile ? "clamp(0.75rem, 3vw, 1.5rem)" : "1.2rem",
                textDecoration: "none",
              }}
            >
              <p style={{
                fontSize: isMobile ? BODY_SIZE.mobile : BODY_SIZE.desktop,
                fontFamily: "var(--font-barlow), sans-serif",
                fontWeight: 400,
                letterSpacing: LABEL_LS,
                color: "#00f5ff",
                textAlign: "center",
                whiteSpace: "pre-line",
                lineHeight: BODY_LH,
                // Altezza di due righe, per tenere le colonne alla stessa quota.
                minHeight: `${BODY_LH * 2}em`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {c.label}
              </p>
              <div
                ref={registerSlot(c.id)}
                style={{
                  width: isMobile ? ARTWORK_SLOT.mobile : ARTWORK_SLOT.desktop,
                  height: isMobile ? ARTWORK_SLOT.mobile : ARTWORK_SLOT.desktop,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FooterArtworkSvg artwork={c.artwork} hovered={hoveredId === c.id} />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Blocco legale */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        fontFamily: "var(--font-barlow), sans-serif",
        fontSize: isMobile ? BODY_SIZE.mobile : BODY_SIZE.desktop,
        lineHeight: BODY_LH,
      }}>
        <p style={{ color: "rgba(0,245,255,0.55)" }}>
          Arc&apos;s Expanse - Proudly made in{" "}
          <a
            href={ARCS_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(0,245,255,0.55)", textDecoration: "underline" }}
          >
            Arc&apos;s
          </a>
        </p>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(0,245,255,0.4)", textDecoration: "underline" }}
          >
            Privacy policy
          </a>
          <a
            href={COOKIE_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(0,245,255,0.4)", textDecoration: "underline" }}
          >
            Cookie policy
          </a>
        </div>
        <p style={{ color: "rgba(0,245,255,0.35)" }}>
          © 2026
        </p>
      </div>
      </footer>
    </>
  );
}
