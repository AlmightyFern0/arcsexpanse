// Stato condiviso dello scorrimento fluido (locomotive-scroll / Lenis).
//
// - Preferenza dell'utente ("Disattiva scorrimento fluido"), salvata nel
//   browser. Con `prefers-reduced-motion: reduce` lo scorrimento fluido resta
//   spento comunque: la preferenza di sistema vince.
// - Istanza attiva, registrata da `components/layout/SmoothScroll.tsx`.
// - Blocchi (menu aperto, splash): con lo scorrimento fluido attivo non basta
//   `overflow: hidden`, la rotella la gestisce Lenis e va fermato.
// - `scrollPageTo`: scroll da codice che passa da Lenis se c'e', altrimenti
//   nativo; mai animato se l'utente ha chiesto movimento ridotto.

import type Lenis from "lenis";

const STORAGE_KEY = "expanse:smooth-scroll";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// --- Preferenza ------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true; // storage bloccato (navigazione privata ecc.): default acceso
  }
}

let preference: boolean | null = null;

/** true = l'utente vuole lo scorrimento fluido (default). */
export function getSmoothPreference(): boolean {
  if (typeof window === "undefined") return true;
  if (preference === null) preference = readStored();
  return preference;
}

export function setSmoothPreference(on: boolean): void {
  preference = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // vale solo per questa visita
  }
  listeners.forEach((l) => l());
}

export function subscribeSmoothPreference(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- Movimento ridotto -----------------------------------------------------

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION).matches;
}

export function subscribeReducedMotion(listener: Listener): () => void {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

// --- Istanza e blocchi -----------------------------------------------------

let lenis: Lenis | null = null;
const locks = new Set<string>();

function applyLocks() {
  if (!lenis) return;
  if (locks.size > 0) lenis.stop();
  else lenis.start();
}

/** Chiamata da SmoothScroll quando l'istanza nasce (o muore: null). */
export function registerLenis(instance: Lenis | null): void {
  lenis = instance;
  applyLocks();
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Ferma (o riavvia) lo scorrimento per un motivo: "menu", "splash"... */
export function setScrollLock(reason: string, locked: boolean): void {
  if (locked) locks.add(reason);
  else locks.delete(reason);
  applyLocks();
}

// --- Scroll da codice ------------------------------------------------------

/**
 * Porta la pagina a `top` (px). `smooth` viene ignorato con movimento ridotto.
 * Con Lenis attivo passa da lui: uno `window.scrollTo` nativo verrebbe
 * sovrascritto da un'animazione Lenis in corso.
 */
export function scrollPageTo(top: number, { smooth = true }: { smooth?: boolean } = {}): void {
  const animate = smooth && !prefersReducedMotion();
  if (lenis) {
    lenis.scrollTo(top, { immediate: !animate, force: true });
    return;
  }
  window.scrollTo({ top, behavior: animate ? "smooth" : "auto" });
}
