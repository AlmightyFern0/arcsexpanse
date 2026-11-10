"use client";

import { useEffect, useRef } from "react";

// Unica luce che segue il mouse su tutta la home, dentro e fuori dalla piega
// hero, e sfondo delle pagine progetto e skill: un gradiente CSS invece di un
// contesto WebGL — zero shader, zero framebuffer, solo un `background` che il
// compositore ridipinge.
const DEFAULT_LIGHT_RGB = "68, 25, 174"; // stesso viola di LIGHT_COLOR in HeroCanvas
const RADIUS_PX = 1400;
const CORE_ALPHA = 1;

// "#RRGGBB" di Sanity in "r, g, b" per la rgba() del gradiente, con fallback
// al viola di default.
const toRgb = (hex: string | undefined): string => {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return DEFAULT_LIGHT_RGB;
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

export default function HeroAmbientLight({ color }: { color?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rgb = toRgb(color);
    const paint = (x: number, y: number) => {
      if (!ref.current) return;
      ref.current.style.background =
        `radial-gradient(${RADIUS_PX}px circle at ${x}px ${y}px, rgba(${rgb}, ${CORE_ALPHA}), transparent 78%)`;
    };
    // Accesa già al primo fotogramma, centrata: senza, finché il mouse non si
    // muove la luce non esiste — sullo stesso schermo dove si atterra ferma
    // dentro `SkillsSection` non arriva mai un `mousemove` e resta invisibile
    // per sempre. Stesso problema (e stessa soluzione) della luce WebGL
    // originale in `HeroCanvas`.
    paint(window.innerWidth / 2, window.innerHeight / 2);
    const onMove = (e: MouseEvent) => paint(e.clientX, e.clientY);
    // Capture, non bubble: la scena Spline di `SkillsSection` ferma la
    // propagazione dei `mousemove` — in bubble la luce si fermava
    // appena il cursore entrava in quell'area.
    window.addEventListener("mousemove", onMove, { capture: true });
    return () => window.removeEventListener("mousemove", onMove, { capture: true });
  }, [color]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        // In home, stesso zIndex di `HeroCanvas` (0): a parità di livello
        // vince l'ordine nel DOM, e questo componente va montato PRIMA di
        // `HeroCanvas` in `page.tsx` — niente zIndex negativo, che su
        // WebKit/Safari più vecchi (proprio l'hardware dei client coinvolti)
        // si è visto comportarsi in modo incoerente dentro contesti di
        // stacking annidati. Quando le forme sono a schermo il canvas —
        // opaco, sfondo compreso — ci sta sopra e la copre; appena si
        // smonta scrollando via la piega, questa torna visibile da sola.
        // Nelle pagine progetto e skill non c'è nessun canvas sopra: resta
        // semplicemente lo sfondo per tutta la pagina.
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
