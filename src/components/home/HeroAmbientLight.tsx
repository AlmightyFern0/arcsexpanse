"use client";

import { useEffect, useRef } from "react";

// Unica luce che segue il mouse su tutta la home, dentro e fuori dalla piega
// hero, e sfondo delle pagine progetto e skill: un gradiente CSS invece di un
// contesto WebGL — zero shader, zero framebuffer, solo un `background` che il
// compositore ridipinge.
type Rgb = [number, number, number];

const DEFAULT_LIGHT_RGB: Rgb = [68, 25, 174]; // stesso viola di LIGHT_COLOR in HeroCanvas
const RADIUS_PX = 1400;
const CORE_ALPHA = 1;

// Fondo pagina sotto la luce (`body` in globals.css).
const BASE_RGB: Rgb = [6, 0, 24];

// Luminanza relativa massima ammessa per lo sfondo sotto il testo (audit §11).
// Il testo della scheda e' bianco e ciano #00F5FF: perche' il ciano resti
// sopra 4,5:1 lo sfondo non deve superare L = 0,123; 0,115 lascia margine
// (ciano 4,9:1, bianco 6,4:1). Le luci scure (Campari #810002, il viola di
// default) ci stanno gia' sotto a piena intensita' e non cambiano: si
// attenuano solo i temi chiari (#ffebeb, #ffc52c, #1fc788...).
const TEXT_SAFE_LUMINANCE = 0.115;

// "#RRGGBB" di Sanity in [r, g, b], con fallback al viola di default.
const toRgb = (hex: string | undefined): Rgb => {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return DEFAULT_LIGHT_RGB;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const channelToLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** Luminanza relativa WCAG di un colore sRGB. */
const luminance = ([r, g, b]: Rgb) =>
  0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);

/** Opacita' massima del centro della luce perche' la luce, composta sul fondo
 *  pagina, non superi `TEXT_SAFE_LUMINANCE`. La luminanza cresce con l'opacita',
 *  quindi basta una ricerca binaria. */
function textSafeAlpha(rgb: Rgb): number {
  const at = (a: number): Rgb =>
    rgb.map((c, i) => c * a + BASE_RGB[i] * (1 - a)) as Rgb;
  if (luminance(at(CORE_ALPHA)) <= TEXT_SAFE_LUMINANCE) return CORE_ALPHA;
  let lo = 0;
  let hi = CORE_ALPHA;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (luminance(at(mid)) <= TEXT_SAFE_LUMINANCE) lo = mid;
    else hi = mid;
  }
  return lo;
}

export default function HeroAmbientLight({ color }: { color?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rgbTuple = toRgb(color);
    const rgb = rgbTuple.join(", ");
    const alpha = textSafeAlpha(rgbTuple).toFixed(3);
    const paint = (x: number, y: number) => {
      if (!ref.current) return;
      ref.current.style.background =
        `radial-gradient(${RADIUS_PX}px circle at ${x}px ${y}px, rgba(${rgb}, ${alpha}), transparent 78%)`;
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
