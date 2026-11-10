"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Splash from "./Splash";

// Tetto di attesa, se la navigazione non arriva mai a destinazione.
const MAX_WAIT_MS = 10000;

/**
 * Mostra lo splash dal click su un link interno fino al cambio di rotta.
 *
 * Il `loading.tsx` di Next compare solo quando arriva la risposta del server:
 * senza questo, fra il click e lo splash non si vede niente.
 */
export default function NavigationSplash() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Click che il browser non tratta come navigazione nella stessa scheda.
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.getAttribute("target") === "_blank") return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      setPending(true);
    };

    // In capture: `Link` chiama `preventDefault` nel proprio handler, che in
    // fase di bubbling gira per primo.
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timeout = setTimeout(() => setPending(false), MAX_WAIT_MS);
    return () => clearTimeout(timeout);
  }, [pending]);

  if (!pending) return null;
  return <Splash />;
}
