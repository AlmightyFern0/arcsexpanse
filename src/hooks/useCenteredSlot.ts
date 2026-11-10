"use client";

import { useEffect, type RefObject } from "react";

/**
 * Segnala quale slot ha il centro verticale piu' vicino al centro dello
 * schermo, come sostituto dell'hover dove il mouse non c'e'. Ne vince uno solo.
 *
 * Con `mustBeVisible` la regione di trigger e' lo slot piu' il suo elemento
 * associato (es. la descrizione che l'attivazione mostra), presi insieme: lo
 * slot e' candidato solo se quella regione sta tutta nel viewport, cosi' quando
 * si accende si vedono sia il 3D sia il testo. Vale al posto del limite di
 * mezzo box. Uno slot senza elemento associato resta escluso.
 */
export function useCenteredSlot(
  elements: RefObject<Map<string, HTMLElement>>,
  enabled: boolean,
  onChange: (key: string | null) => void,
  mustBeVisible?: RefObject<Map<string, HTMLElement>>
) {
  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let active: string | null = null;

    const check = () => {
      raf = 0;
      const viewportHeight = window.innerHeight;
      const viewportCenter = viewportHeight / 2;
      let best: string | null = null;
      let bestDistance = Infinity;

      elements.current.forEach((el, key) => {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
        let eligible: boolean;
        if (mustBeVisible) {
          const target = mustBeVisible.current.get(key);
          if (!target) return;
          const t = target.getBoundingClientRect();
          const top = Math.min(rect.top, t.top);
          const bottom = Math.max(rect.bottom, t.bottom);
          // Piu' alta dello schermo non sta mai tutta: basta che ne copra il centro.
          eligible =
            bottom - top > viewportHeight
              ? top <= viewportCenter && bottom >= viewportCenter
              : top >= 0 && bottom <= viewportHeight;
        } else {
          // Oltre mezzo box di distanza non conta come centrato.
          eligible = distance < Math.max(rect.height / 2, 1);
        }
        if (eligible && distance < bestDistance) {
          bestDistance = distance;
          best = key;
        }
      });

      if (best !== active) {
        active = best;
        onChange(best);
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(check);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      onChange(null);
    };
    // `onChange` cambia identita' a ogni render del chiamante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, elements, mustBeVisible]);
}
