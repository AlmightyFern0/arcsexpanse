"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import {
  getSmoothPreference,
  prefersReducedMotion,
  setSmoothPreference,
  subscribeReducedMotion,
  subscribeSmoothPreference,
} from "@/lib/smoothScroll";

const subscribeNoop = () => () => {};

// Pulsante "Disattiva / Attiva scorrimento fluido". L'etichetta dice l'azione
// (niente aria-pressed: con un nome che cambia sarebbe un doppio segnale).
// Con movimento ridotto attivo nel sistema non compare: lo scorrimento fluido
// e' gia' spento e il pulsante non avrebbe effetto.
export default function SmoothScrollToggle({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const on = useSyncExternalStore(subscribeSmoothPreference, getSmoothPreference, () => true);
  const reduced = useSyncExternalStore(
    typeof window === "undefined" ? subscribeNoop : subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
  if (reduced) return null;

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => setSmoothPreference(!on)}
    >
      {on ? "Disattiva scorrimento fluido" : "Attiva scorrimento fluido"}
    </button>
  );
}
