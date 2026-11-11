"use client";

import { useEffect, useState } from "react";
import Splash from "./Splash";
import { subscribePageReadyStatus, getPageReadyStatus } from "@/lib/pageReady";
import { setScrollLock } from "@/lib/smoothScroll";

// Tetto di attesa, come rete di sicurezza contro una scena che non carica mai.
//
// Tenuto largo di proposito: `SplineStage` si dichiara pronto solo a gruppi
// posizionati e dissolvenza conclusa, quindi aspettarlo è il punto — se lo
// splash sparisce prima, il caricamento della sezione skill si vede a schermo.
// Su una connessione lenta scaricamento, parse e compilazione degli shader
// possono superare abbondantemente i sei secondi di prima.
const MAX_WAIT_MS = 15000;

// Una volta per documento. Il componente rimonta a ogni navigazione client, ma
// il modulo resta in memoria: così la regola vale solo per il caricamento vero
// — primo accesso o ricarica — e non per il ritorno in home da una pagina
// progetto, dove la posizione sulla griglia va conservata.
let initialScrollHandled = false;

export default function PageLoader({
  children,
  startAtTop = false,
}: {
  children: React.ReactNode;
  /** Al caricamento parte sempre dall'inizio della pagina, ignorando la
   * posizione che il browser ripristinerebbe. */
  startAtTop?: boolean;
}) {
  const [done, setDone] = useState(false);

  // Ogni caricamento parte dall'hero.
  //
  // Il browser, ricaricando, ripristina lo scroll: se eri sulle skill l'hero
  // resta fuori schermo, `HeroCanvas` non si arma mai e lo splash lo toglieva
  // solo il fallback da 5 s — allungato dal freeze della scena Spline, che
  // intanto si costruiva perché la sua sezione era in vista. Partendo sempre
  // dall'alto lo splash aspetta solo l'hero, e Spline si carica quando ci si
  // arriva scrollando.
  //
  // `manual` solo per questo caricamento: Next non gestisce lo scroll sul tasto
  // indietro e si affida al browser in `auto`, quindi lasciarlo `manual` farebbe
  // perdere la posizione tornando da una pagina progetto.
  useEffect(() => {
    if (!startAtTop || initialScrollHandled) return;
    initialScrollHandled = true;

    // Un'ancora esplicita (`/#progetti`) è una destinazione, non una posizione
    // da ripristinare: va rispettata.
    if (window.location.hash) return;

    const { history } = window;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // Il browser ritenta il ripristino finché la pagina carica: si torna ad
    // `auto` solo dopo, quando per questa voce non ci riproverà più. Senza
    // cleanup di proposito: in StrictMode l'effetto gira due volte e la seconda
    // esce per il flag, quindi rimuovere il listener lascerebbe `manual` per
    // sempre.
    const restoreAuto = () =>
      requestAnimationFrame(() => {
        history.scrollRestoration = "auto";
      });
    if (document.readyState === "complete") restoreAuto();
    else window.addEventListener("load", restoreAuto, { once: true });
  }, [startAtTop]);

  useEffect(() => {
    // Finestra di grazia: senza, "nessuna scena registrata" verrebbe letto come
    // "niente da aspettare" e lo splash sparirebbe prima che il caricamento
    // cominci.
    //
    // Basta il tempo che girino gli effetti di mount: ogni superficie che
    // blocca lo splash si registra lì — `HeroCanvas` e `SplineStage` (solo se
    // costruisce da zero) — e gli effetti dei figli girano
    // prima di questo.
    const startedAt = performance.now();
    const GRACE_MS = 250;

    const check = () => {
      if (performance.now() - startedAt < GRACE_MS) return;

      const { total, ready } = getPageReadyStatus();
      if (total === 0 || ready >= total) setDone(true);
    };

    check();
    const unsubscribe = subscribePageReadyStatus(check);
    const grace = setTimeout(check, GRACE_MS + 50);
    const timeout = setTimeout(() => setDone(true), MAX_WAIT_MS);

    return () => {
      unsubscribe();
      clearTimeout(grace);
      clearTimeout(timeout);
    };
  }, []);

  // Pagina ferma finché lo splash è su. Senza, la rotella lo attraversava e
  // scorreva la home sotto: gli IntersectionObserver scattavano alla cieca e si
  // poteva armare la scena Spline — la più cara della pagina — senza vederla.
  //
  // Su `<html>` e non su `<body>`: il body lo usa già il menu (`Navbar`), e due
  // proprietari dello stesso stile si sovrascriverebbero il valore a vicenda.
  // `scrollbar-gutter` tiene il posto della barra, così allo sblocco il
  // contenuto non salta di lato.
  useEffect(() => {
    if (done) return;
    const root = document.documentElement;
    const previous = {
      overflow: root.style.overflow,
      scrollbarGutter: root.style.scrollbarGutter,
    };
    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "stable";
    // Con lo scorrimento fluido la rotella la gestisce Lenis: va fermato.
    setScrollLock("splash", true);
    return () => {
      setScrollLock("splash", false);
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.scrollbarGutter;
    };
  }, [done]);

  return (
    <>
      {children}
      <Splash
        style={{
          opacity: done ? 0 : 1,
          // Intercetta tutto finché è visibile; in dissolvenza non deve più
          // bloccare i clic sulla pagina che sta scoprendo.
          pointerEvents: done ? "none" : "auto",
          // 0.8s erano quasi un secondo di schermo velato *dopo* che la pagina
          // era già pronta. Basta quel tanto che lo stacco non sia secco.
          transition: "opacity 0.35s ease",
        }}
      />
    </>
  );
}
