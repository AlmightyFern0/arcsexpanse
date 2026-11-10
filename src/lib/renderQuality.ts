"use client";

import { noteGlRelease } from "@/lib/glScheduler";

// Qualità di rendering dei canvas WebGL, decisa in un posto solo.
//
// Su mobile il costo per frame è dominato dal riempimento: a DPR 2 un canvas a
// tutto schermo su un telefono medio supera il milione di pixel per fotogramma,
// e l'antialias multisample lo moltiplica ancora. Dimezzare il pixel ratio
// significa un quarto dei pixel, ed è la leva singola più efficace.

// Stessa soglia di useIsMobile.ts: sotto i 1024px (tablet inclusi) niente
// hover reale e GPU più modesta, quindi qualità ridotta come su telefono.
const MOBILE_QUERY = "(max-width: 1024px)";
const MOBILE_PIXEL_RATIO = 1;
const DESKTOP_PIXEL_RATIO = 2;

// Tetto sui pixel del framebuffer. Il cap per classe non bastava: un iMac 5K è
// "desktop", prendeva DPR 2 e allocava 14,7 Mpx per contesto.
const MAX_CANVAS_PIXELS = 5_000_000;

// Il multisample moltiplica il framebuffer per il numero di campioni.
const MAX_ANTIALIAS_PIXELS = 3_000_000;

export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

// AMD discrete dei Mac Intel: lì il thrash di memoria video non degrada, panica
// il kernel. Trattate come mobile a prescindere dal viewport.
let lowVramCache: boolean | null = null;

export function isLowVramGpu(): boolean {
  if (lowVramCache !== null) return lowVramCache;
  if (typeof window === "undefined") return false;

  lowVramCache = false;
  try {
    const isMac = /Mac/i.test(navigator.platform || navigator.userAgent);
    if (!isMac) return lowVramCache;

    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return lowVramCache;

    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? "")
      : "";
    lowVramCache = /radeon|amd|firepro/i.test(renderer);

    // Il contesto di sonda non deve occupare uno slot. La distruzione va
    // dichiarata allo scheduler: senza, l'allocazione successiva parte mentre
    // il browser sta ancora liberando — il caso peggiore sui driver AMD, e
    // proprio quello che `glScheduler` esiste per evitare.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    noteGlRelease();
  } catch {
    // Niente WebGL: profilo normale.
  }
  return lowVramCache;
}

/** Misura il profilo GPU e memorizza il risultato. Va chiamata *prima* di
 * mettersi in coda per un contesto: la sonda ne distrugge uno, e dentro la
 * `create` quella distruzione cadrebbe nello stesso istante dell'allocazione
 * vera. Chiamata qui, il raffreddamento dello scheduler la copre. */
export function warmGpuProfile(): void {
  isLowVramGpu();
}

/** Pixel ratio da usare. Passare le dimensioni CSS quando si conoscono: senza,
 * il budget non si può applicare e resta solo il cap per classe. */
export function targetPixelRatio(cssWidth?: number, cssHeight?: number): number {
  if (typeof window === "undefined") return 1;

  const classCap =
    isMobileViewport() || isLowVramGpu() ? MOBILE_PIXEL_RATIO : DESKTOP_PIXEL_RATIO;
  let ratio = Math.min(window.devicePixelRatio || 1, classCap);

  const cssPixels = (cssWidth ?? 0) * (cssHeight ?? 0);
  if (cssPixels > 0) {
    ratio = Math.min(ratio, Math.sqrt(MAX_CANVAS_PIXELS / cssPixels));
  }

  // Sotto 1 la sgranatura si vede: chi non ci sta comunque usa `downscale`.
  return Math.max(1, ratio);
}

/** Multisample: caro sulle GPU mobile, primo consumo da tagliare su superfici
 * grandi. */
export function shouldAntialias(cssWidth?: number, cssHeight?: number): boolean {
  if (isMobileViewport() || isLowVramGpu()) return false;

  const cssPixels = (cssWidth ?? 0) * (cssHeight ?? 0);
  if (cssPixels <= 0) return true;

  const ratio = targetPixelRatio(cssWidth, cssHeight);
  return cssPixels * ratio * ratio <= MAX_ANTIALIAS_PIXELS;
}

// Lasciato al browser di proposito.
//
// Era "high-performance", per non farsi assegnare l'integrata sui portatili a
// GPU ibrida. Ma sui MacBook Pro Intel quel valore forza l'accensione della AMD
// discreta, e lo switch di GPU sotto pressione di memoria e' una delle cause
// note di blocco dell'intera macchina — non della sola scheda. L'integrata
// regge queste scene senza problemi: il guadagno non vale il rischio.
export const POWER_PREFERENCE: WebGLPowerPreference = "default";

// Più campioni consecutivi: un secondo lento isolato (caricamento, GC) non
// deve degradare la qualità per sempre.
const LOW_FPS = 45;
const LOW_FPS_SAMPLES = 3;
const MIN_PIXEL_RATIO = 1;
const DEGRADE_STEP = 0.75;

/** Abbassa il pixel ratio quando la macchina non tiene. Chiamare una volta per frame. */
export function createFpsGovernor(
  initialPixelRatio: number,
  onDegrade: (pixelRatio: number) => void
) {
  let pixelRatio = initialPixelRatio;
  let frames = 0;
  let windowStart = 0;
  let lowStreak = 0;

  return (now: number) => {
    if (windowStart === 0) { windowStart = now; return; }
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed < 1000) return;

    const fps = (frames * 1000) / elapsed;
    frames = 0;
    windowStart = now;

    if (fps >= LOW_FPS) { lowStreak = 0; return; }

    lowStreak += 1;
    if (lowStreak < LOW_FPS_SAMPLES || pixelRatio <= MIN_PIXEL_RATIO) return;

    lowStreak = 0;
    pixelRatio = Math.max(MIN_PIXEL_RATIO, pixelRatio * DEGRADE_STEP);
    onDegrade(pixelRatio);
  };
}
