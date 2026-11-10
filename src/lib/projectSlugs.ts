// Slug dei progetti rinominati (audit §9.2): vecchio → nuovo.
//
// Gli slug vivono su Sanity, non nel codice: il cambio si fa a mano nello
// Studio. Per non legare il deploy all'ordine delle operazioni, il redirect lo
// decide la pagina progetto e non `next.config.ts`:
// - vecchio slug non più su Sanity  → 308 verso il nuovo (link storici, indici);
// - nuovo slug non ancora su Sanity → 307 temporaneo verso il vecchio, solo
//   finché il cambio nello Studio non è fatto.
// In entrambi i casi si redirige solo se la destinazione esiste: niente loop.
//
// Quando tutti i cambi sono fatti, la seconda regola non scatta più da sola.
export const LEGACY_PROJECT_SLUGS: Record<string, string> = {
  "rome's-immersive-library": "romes-immersive-library",
  "nutella-croissant-shopper-journey-strategy": "nutella-croissant-shopper-journey",
  "campari-virtual-experience": "concept-campari-virtual-experience",
};

const CURRENT_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_PROJECT_SLUGS).map(([oldSlug, newSlug]) => [newSlug, oldSlug]),
);

/** Slug alternativo da provare quando `slug` non esiste su Sanity. */
export function alternateProjectSlug(
  slug: string,
): { slug: string; permanent: boolean } | null {
  if (LEGACY_PROJECT_SLUGS[slug]) return { slug: LEGACY_PROJECT_SLUGS[slug], permanent: true };
  if (CURRENT_TO_LEGACY[slug]) return { slug: CURRENT_TO_LEGACY[slug], permanent: false };
  return null;
}

/** Slug come arriva dall'URL: `rome%27s-…` e `rome's-…` sono lo stesso. */
export function normalizeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}
