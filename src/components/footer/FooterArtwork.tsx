"use client";

import { EMAIL_ARTWORK, FORM_ARTWORK, type FooterArtwork } from "./footerArtworkData";

const ARTWORK_COLOR = "#00F5FF";

// Transizione Smart Animate del componente Figma: 300ms, EASE_OUT.
const TRANSITION_MS = 300;
const TRANSITION_EASE = "cubic-bezier(0, 0, 0.58, 1)";

// Lato dello slot quadrato che ospita l'artwork. Desktop: Figma, 198px @1920.
const ARTWORK_SLOT = {
  desktop: "clamp(96px, min(10.32vw, 20svh), 198px)",
  mobile: "clamp(72px, min(42vw, 19svh), 200px)",
};

// Altezza a cui sono rapportati entrambi gli artwork, per tenerli sulla stessa
// griglia dentro slot uguali.
const MAX_ARTWORK_HEIGHT = Math.max(EMAIL_ARTWORK.height, FORM_ARTWORK.height);

export { ARTWORK_SLOT };

type Props = {
  artwork: FooterArtwork;
  hovered: boolean;
  /** Descrizione per gli screen reader; senza, l'SVG resta decorativo. */
  label?: string;
};

/**
 * Rende un artwork del footer e ne anima le forme fra stato a riposo e hover.
 */
export default function FooterArtworkSvg({ artwork, hovered, label }: Props) {
  return (
    <svg
      viewBox={artwork.viewBox}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        // `clipsContent` del componente Figma.
        overflow: artwork.clip ? "hidden" : "visible",
        display: "block",
        // Larghezza ricavata dal browser dal rapporto del viewBox.
        height: `calc(100% * ${artwork.height} / ${MAX_ARTWORK_HEIGHT})`,
        width: "auto",
      }}
    >
      <style>{`
        .footer-artwork-shape {
          transform-box: view-box;
          transform-origin: 0 0;
          transition: transform ${TRANSITION_MS}ms ${TRANSITION_EASE};
        }
        @media (prefers-reduced-motion: reduce) {
          .footer-artwork-shape { transition: none; }
        }
      `}</style>
      {artwork.shapes.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill={ARTWORK_COLOR}
          className="footer-artwork-shape"
          style={{
            transform: hovered
              ? `translate(${s.hx}px, ${s.hy}px) scale(${s.sx ?? 1}, ${s.sy ?? 1})`
              : `translate(${s.x}px, ${s.y}px)`,
          }}
        />
      ))}
    </svg>
  );
}
