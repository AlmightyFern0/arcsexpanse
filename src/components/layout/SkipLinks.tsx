// Menu di salto (WCAG 2.4.1 "Bypass blocks"): primo elemento raggiungibile con
// Tab in ogni pagina. Invisibile finche' non riceve il focus da tastiera, poi
// compare in alto a sinistra; Invio porta il focus all'inizio della sezione
// scelta e il Tab successivo prosegue da li'.
//
// Le sezioni di destinazione hanno `tabIndex={-1}` (ricevono il focus da un
// link ma non diventano una tappa del Tab) e la classe `skip-target` (vedi
// globals.css: nessun anello sulla sezione).
//
// In coda c'e' "Disattiva scorrimento fluido": chi naviga da tastiera lo trova
// subito, prima di qualsiasi contenuto.
//
// Va messo PRIMA di <main> e della navbar, cosi' e' il primo Tab.

import SmoothScrollToggle from "./SmoothScrollToggle";

export interface SkipLink {
  /** id della sezione, senza "#". */
  id: string;
  label: string;
}

export default function SkipLinks({ links }: { links: SkipLink[] }) {
  return (
    <div className="skip-links">
      {links.length > 0 && (
        <nav aria-label="Vai alla sezione">
          <span className="skip-links__title" aria-hidden="true">Vai a:</span>
          <ul>
            {links.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <SmoothScrollToggle className="skip-links__toggle" />
    </div>
  );
}
