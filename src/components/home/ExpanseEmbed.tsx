"use client";

import { useEffect, useRef, useState } from "react";
import { DiagonalButton } from "@/components/ui/DiagonalButton";
import { contentContainer } from "@/lib/layout";

// Esperienza Expanse incorporata in home (prima era il portale di CosaVedere).
// Host gia' ammesso in `frame-src` nella CSP di next.config.ts.
const EXPANSE_URL = "https://storage.net-fs.com/hosting/8574980/4/";

// Fondo del pulsante sopra l'iframe: il contenuto sotto puo' essere chiaro, e
// il testo ciano a 11px deve restare sopra 4,5:1 (su questo fondo ~11:1).
const BUTTON_FILL = "rgba(6, 0, 24, 0.85)";

export default function ExpanseEmbed() {
  // Finche' l'overlay e' visibile la rotella scorre la pagina, non l'iframe.
  const [active, setActive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activate = () => {
    setActive(true);
    // Il pulsante sparisce: il focus passa all'iframe invece di perdersi.
    requestAnimationFrame(() => iframeRef.current?.focus());
  };

  // Disattiva con un tap (mobile) o un focus da tastiera fuori dalla sezione.
  useEffect(() => {
    if (!active) return;
    const outside = (e: Event) => {
      if (!sectionRef.current?.contains(e.target as Node)) setActive(false);
    };
    document.addEventListener("touchstart", outside, { passive: true });
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("touchstart", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [active]);

  return (
    <section
      ref={sectionRef}
      // Destinazione della voce di menu "Immersive Experience" (/#experience)
      // e della voce "Esperienza" del menu di salto.
      id="experience"
      tabIndex={-1}
      className="skip-target"
      aria-label="Esperienza interattiva Expanse"
      style={{
        position: "relative",
        zIndex: 1,
        ...contentContainer,
        paddingBottom: "6rem",
      }}
    >
      <style>{`
        .xp-embed__frame {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          max-height: 80vh;
          overflow: hidden;
          background: #060018;
        }
        @media (max-width: 768px) {
          .xp-embed__frame { aspect-ratio: 4 / 5; }
        }
      `}</style>

      <div className="xp-embed__frame" onMouseLeave={() => setActive(false)}>
        <iframe
          ref={iframeRef}
          src={EXPANSE_URL}
          title="Esperienza interattiva Expanse"
          loading="lazy"
          allow="fullscreen; gyroscope; accelerometer; xr-spatial-tracking; autoplay"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />

        {!active && (
          // Il click ovunque sull'overlay attiva (mouse); per la tastiera c'e'
          // il pulsante, che e' l'unico elemento focalizzabile qui dentro.
          <div
            onClick={activate}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(6, 0, 24, 0.35)",
              cursor: "pointer",
            }}
          >
            <DiagonalButton onClick={activate} idleFill={BUTTON_FILL}>
              Clicca per interagire
            </DiagonalButton>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
        <DiagonalButton href={EXPANSE_URL} external>
          Apri a schermo intero
        </DiagonalButton>
      </div>
    </section>
  );
}
