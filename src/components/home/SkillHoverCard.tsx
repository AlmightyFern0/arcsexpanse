"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";

// Distanza fra il titolo della skill e il bordo alto della card.
const OFFSET_Y = 14;
// Larghezza massima: oltre, le righe della descrizione diventano troppo lunghe.
export const SKILL_CARD_MAX_WIDTH = 360;
// Margine minimo dai bordi del viewport.
const GUTTER = 16;

// Condiviso con lo spazio riservato su mobile (`SkillsSection`): se la sagoma
// invisibile e la card vera non hanno lo stesso testo, le righe vanno a capo
// in punti diversi e la card non combacia piu' con lo spazio tenuto per lei.
export const SKILL_CARD_TEXT_STYLE: CSSProperties = {
  fontFamily: "var(--font-barlow), sans-serif",
  fontSize: "0.95rem",
  fontWeight: 300,
  lineHeight: 1.65,
  color: "rgba(255,255,255,0.86)",
  whiteSpace: "pre-line",
};
// Deve combaciare con la durata di `skill-card-off` in globals.css.
const EXIT_MS = 260;

type Phase = "hidden" | "on" | "off";

interface Position {
  top: number;
  left: number;
  width: number;
}

/**
 * Card con la descrizione della skill, sopra a tutto e sotto il titolo.
 *
 * Vive in un portal su `body` in coordinate di documento: dentro la sezione
 * verrebbe tagliata dal `clipPath` diagonale, e in flusso farebbe crescere la
 * riga, spostando gli slot su cui e' centrata la scena Spline.
 *
 * `placement`: "below" la mette sotto l'ancora (desktop, sopra le card vicine);
 * "over" la sovrappone all'ancora, che su mobile e' lo spazio gia' riservato in
 * flusso per lei.
 */
export default function SkillHoverCard({
  id,
  open,
  text,
  anchorRef,
  centered = false,
  placement = "below",
}: {
  id: string;
  open: boolean;
  text: string;
  anchorRef: RefObject<HTMLElement | null>;
  centered?: boolean;
  placement?: "below" | "over";
}) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [pos, setPos] = useState<Position | null>(null);

  const measure = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    if (placement === "over") {
      setPos({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
      return;
    }
    const vw = document.documentElement.clientWidth;
    const width = Math.min(SKILL_CARD_MAX_WIDTH, vw - GUTTER * 2);
    const preferred = centered ? rect.left + rect.width / 2 - width / 2 : rect.left;
    const left = Math.min(Math.max(preferred, GUTTER), vw - GUTTER - width);
    setPos({ top: rect.bottom + window.scrollY + OFFSET_Y, left: left + window.scrollX, width });
  }, [anchorRef, centered, placement]);

  // Misura prima del paint, cosi' la card non nasce mai nel punto sbagliato.
  useLayoutEffect(() => {
    if (open) {
      measure();
      setPhase("on");
    } else {
      setPhase((p) => (p === "hidden" ? p : "off"));
    }
  }, [open, measure]);

  useEffect(() => {
    if (phase !== "off") return;
    const t = window.setTimeout(() => setPhase("hidden"), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "on") return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase, measure]);

  if (phase === "hidden" || !pos) return null;

  return createPortal(
    <div
      id={id}
      role="tooltip"
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: "max-content",
        maxWidth: pos.width,
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <div className={`skill-card ${phase === "on" ? "skill-card--on" : "skill-card--off"}`}>
        <p className="skill-card__text" style={SKILL_CARD_TEXT_STYLE}>
          {text}
        </p>
      </div>
    </div>,
    document.body,
  );
}
