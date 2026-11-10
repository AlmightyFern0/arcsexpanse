// Menu di salto (WCAG 2.4.1 "Bypass blocks"): primo elemento raggiungibile con
// Tab in ogni pagina. Invisibile finche' non riceve il focus da tastiera, poi
// compare in alto a sinistra; Invio porta il focus all'inizio della sezione
// scelta e il Tab successivo prosegue da li'.
//
// Le sezioni di destinazione hanno `tabIndex={-1}` (ricevono il focus da un
// link ma non diventano una tappa del Tab) e la classe `skip-target` (vedi
// globals.css: margine per la barra fissa, nessun anello sulla sezione).
//
// Va messo PRIMA di <main> e della navbar, cosi' e' il primo Tab.

export interface SkipLink {
  /** id della sezione, senza "#". */
  id: string;
  label: string;
}

export default function SkipLinks({ links }: { links: SkipLink[] }) {
  if (links.length === 0) return null;
  return (
    <nav aria-label="Vai alla sezione" className="skip-links">
      <span className="skip-links__title" aria-hidden="true">Vai a:</span>
      <ul>
        {links.map((l) => (
          <li key={l.id}>
            <a href={`#${l.id}`}>{l.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
