"use client";

import { useRef } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useNearViewport } from "@/hooks/useNearViewport";
import PortalCanvas from "@/components/home/PortalCanvas";
import { DiagonalButton } from "@/components/ui/DiagonalButton";
import { contentContainer } from "@/lib/layout";

// Immagine vista "dall'altra parte" del portale — lo screen della pagina di
// ingresso dell'esperienza Expanse. Va salvata in public/ con questo nome.
// Se manca, il portale mostra il vuoto scuro invece di rompersi.
const PORTAL_IMAGE = "/portal.jpg";

const EXPANSE_URL = "https://storage.net-fs.com/hosting/8574980/4/";

// Margine laterale del portale su mobile, in px dai bordi dello schermo.
const MOBILE_SIDE_MARGIN = 24;

export default function CosaVedere() {
  const isMobile = useIsMobile();

  // Terza superficie WebGL della pagina, e la più in basso: non serve
  // all'atterraggio.
  const sectionRef = useRef<HTMLElement>(null);
  const nearViewport = useNearViewport(sectionRef);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        ...contentContainer,
        paddingTop: "3rem",
        paddingBottom: "8rem",
      }}
    >
      <div style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "2.5rem",
      }}>
        <h2
          className="cosavedere-title"
          style={{
            fontSize: "clamp(1.8rem, 5vw, 4rem)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#ffffff",
            lineHeight: 1.1,
          }}
        >
          COS&apos;ALTRO C&apos;È DA VEDERE?
        </h2>

        <div>
          <DiagonalButton href="/works">Voglio scoprirlo →</DiagonalButton>
        </div>

        <a
          href={EXPANSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            // Su mobile il portale esce dai margini del content container e
            // arriva a 24px dai bordi dello schermo. Il genitore centra in
            // flex, quindi la larghezza extra sborda in modo simmetrico.
            width: isMobile ? `calc(100vw - ${MOBILE_SIDE_MARGIN * 2}px)` : "100%",
            maxWidth: isMobile ? "none" : 900,
            aspectRatio: "4 / 3",
            marginTop: "6rem",
            cursor: "pointer",
          }}
        >
          {nearViewport && (
            <PortalCanvas
              imageUrl={PORTAL_IMAGE}
              alt="Entra nell'esperienza Expanse"
              activateOnCenter={isMobile}
            />
          )}
        </a>
      </div>
    </section>
  );
}
