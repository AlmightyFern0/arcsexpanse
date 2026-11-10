"use client";

import { useEffect, useState, type RefObject } from "react";

// Preavviso di circa uno schermo, così arriva già pronta.
const DEFAULT_ROOT_MARGIN = "800px";

/**
 * `true` la prima volta che l'elemento si avvicina al viewport, senza tornare
 * indietro: serve a montare le superfici 3D sotto la piega, non a metterle in
 * pausa.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  rootMargin: string = DEFAULT_ROOT_MARGIN
): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;

    // Senza IntersectionObserver si monta subito, meglio che mai.
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [ref, rootMargin, near]);

  return near;
}
