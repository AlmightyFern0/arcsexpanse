"use client";

import { useEffect, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "locomotive-scroll/locomotive-scroll.css";
import {
  getLenis,
  getSmoothPreference,
  prefersReducedMotion,
  registerLenis,
  subscribeReducedMotion,
  subscribeSmoothPreference,
} from "@/lib/smoothScroll";

// Scorrimento fluido con locomotive-scroll 5 (motore Lenis), montato una volta
// nel layout radice.
//
// Accessibilita':
// - Spento con `prefers-reduced-motion: reduce` o se l'utente lo disattiva
//   ("Disattiva scorrimento fluido" nel menu di salto e nel menu principale).
// - Lenis lascia lo scroll NATIVO del documento (niente transform sul
//   contenuto): screen reader, Cerca nella pagina, ancore, barra di
//   scorrimento, tastiera (frecce, Spazio, PagGiu) e touch restano quelli del
//   browser. Liscia solo la rotella del mouse/trackpad.
// - Tasto centrale: Lenis si azzera al click e lascia lavorare l'autoscroll
//   del browser; i link restano <a href> veri, quindi il click centrale apre
//   una nuova scheda come sempre (`anchors: false`, nessun click intercettato).
// - Focus da tastiera: l'elemento che riceve il focus viene portato a schermo
//   con `scrollIntoView()` (vedi onFocusIn), tenendo conto della barra fissa
//   tramite `scroll-padding-top` in globals.css.

const subscribeNoop = () => () => {};

/** Il focus e' dentro un livello fisso (barra, footer, menu di salto)? */
function inFixedLayer(el: Element): boolean {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    if (getComputedStyle(n).position === "fixed") return true;
  }
  return false;
}

function onFocusIn(e: FocusEvent) {
  const el = e.target;
  if (!(el instanceof HTMLElement) || el === document.body) return;
  // Solo focus da tastiera (o campi di testo): un click col mouse su un
  // elemento mezzo visibile non deve far saltare la pagina.
  if (!el.matches(":focus-visible")) return;
  // Sezioni del menu di salto: le porta gia' a schermo l'ancora.
  if (el.classList.contains("skip-target")) return;
  // Scorrere la pagina non sposta gli elementi fissi.
  if (inFixedLayer(el)) return;

  const rect = el.getBoundingClientRect();
  const padTop = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  if (rect.top >= padTop && rect.bottom <= window.innerHeight) return;

  // Un'animazione Lenis in corso riporterebbe la pagina dov'era: la si
  // ferma sul posto prima di lasciare fare al browser.
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export default function SmoothScroll() {
  const wantsSmooth = useSyncExternalStore(subscribeSmoothPreference, getSmoothPreference, () => true);
  const reduced = useSyncExternalStore(
    typeof window === "undefined" ? subscribeNoop : subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
  const enabled = wantsSmooth && !reduced;

  useEffect(() => {
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let instance: { destroy(): void } | null = null;

    gsap.registerPlugin(ScrollTrigger);

    // Import dinamico: niente codice di locomotive per chi lo ha spento.
    import("locomotive-scroll").then(({ default: LocomotiveScroll }) => {
      if (cancelled) return;
      const loco = new LocomotiveScroll({
        lenisOptions: {
          lerp: 0.1,
          smoothWheel: true,
          syncTouch: false, // touch nativo
          anchors: false, // ancore e click lasciati al browser
          allowNestedScroll: true, // menu, textarea, ecc. scorrono da soli
          stopInertiaOnNavigate: true,
        },
        // Le animazioni GSAP leggono la posizione ad ogni passo di Lenis.
        scrollCallback: () => ScrollTrigger.update(),
        initCustomTicker: (render) => gsap.ticker.add(render),
        destroyCustomTicker: (render) => gsap.ticker.remove(render),
      });
      instance = loco;
      // locomotive avvia Lenis al primo frame (e con start() lo sblocca):
      // si registra dopo, cosi' i blocchi gia' attivi (splash, menu aperto)
      // restano validi.
      requestAnimationFrame(() => {
        if (!cancelled) registerLenis(loco.lenisInstance);
      });
    });

    return () => {
      cancelled = true;
      registerLenis(null);
      instance?.destroy();
    };
  }, [enabled]);

  return null;
}
