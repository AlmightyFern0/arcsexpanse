import { useEffect, useState } from "react";

/**
 * Restituisce true quando il viewport è <= maxWidth.
 * SSR-safe: primo render sempre false (coerente server/client), poi aggiorna al mount.
 *
 * Soglia a 1024, non 768: sotto questa larghezza non c'è hover reale (tablet
 * inclusi), quindi le animazioni devono attivarsi da sole invece di aspettare
 * un mouseenter che su touch non arriva mai.
 */
export function useIsMobile(maxWidth = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    // Il primo valore va preso subito: e' quello che decide quale scena
    // caricare, e ritardarlo di mezzo secondo si vedrebbe.
    setIsMobile(mq.matches);

    let timer: ReturnType<typeof setTimeout>;
    // I cambi successivi si aspettano. Chi legge questo valore sceglie una
    // scena 3D diversa, e cambiarla significa buttare un contesto WebGL e
    // ricrearne un altro con tutto il download e la compilazione shader che
    // comporta. Trascinando il bordo della finestra avanti e indietro sopra la
    // soglia, senza attesa si paga quel prezzo a ogni attraversamento.
    const SETTLE_MS = 400;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIsMobile(mq.matches), SETTLE_MS);
    };

    mq.addEventListener("change", update);
    return () => {
      clearTimeout(timer);
      mq.removeEventListener("change", update);
    };
  }, [maxWidth]);

  return isMobile;
}
