"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { SplineStageHandle } from "@/components/spline/SplineStage";

/**
 * Tiene misurati i box che gli oggetti 3D devono inseguire e li consegna allo
 * stage. Usato da ogni sezione che monta uno `SplineStage`.
 *
 * Restituisce `registerSlot`, da passare come `ref` al box di ogni slot, e
 * `pushLayout`, che rimisura tutto e lo manda allo stage.
 */
export function useSplineSlots(stageRef: RefObject<SplineStageHandle | null>, enabled = true) {
  const elements = useRef(new Map<string, HTMLElement>());

  const registerSlot = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) elements.current.set(key, el);
      else elements.current.delete(key);
    },
    []
  );

  const pushLayout = useCallback(() => {
    const slots = [...elements.current].map(([slug, el]) => ({ slug, rect: el.getBoundingClientRect() }));
    stageRef.current?.layoutSlots(slots);
  }, [stageRef]);

  useEffect(() => {
    if (!enabled) return;

    // Due frame di ritardo: al resize il canvas di Spline si ridimensiona dopo
    // il layout del DOM, e misurare subito produrrebbe una proiezione basata
    // sulle dimensioni vecchie.
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => requestAnimationFrame(pushLayout));
    };

    pushLayout();

    // I box hanno dimensione fissa: al resize della finestra cambia la loro
    // posizione, non la dimensione, quindi ResizeObserver da solo non scatta
    // mai. Senza questo listener il 3D resta fermo mentre i box si spostano.
    window.addEventListener("resize", schedule);

    // Copre i riflussi che non passano dalla finestra (caricamento font, cambio
    // di contenuto): lì la dimensione di qualche box cambia davvero.
    const observer = new ResizeObserver(schedule);
    elements.current.forEach((el) => observer.observe(el));
    document.fonts?.ready.then(schedule).catch(() => { /* browser senza Font Loading API */ });

    return () => {
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [enabled, pushLayout]);

  return { registerSlot, pushLayout, elements };
}
