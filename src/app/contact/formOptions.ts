// Opzioni del form contatti, condivise fra client (chip) e server (allowlist,
// audit §12.1). Un file "use server" puo' esportare solo funzioni async,
// quindi le costanti stanno qui.

export const TAGS = [
  "Video animazione 3D",
  "FOOH & 3D OOH",
  "Immersive Room",
  "Virtual Showroom 3D",
  "Rendering",
  "Expo",
  "Industrial Design",
  "Food Design",
  "Packaging Design",
  "Digital Twin",
  "VR & AR",
  "App & Gaming",
  "Hologram",
  "Interior Design",
  "Marketing Strategic Visualization",
  "AI",
  "Non lo so, voglio che me lo diciate voi",
] as const;

/** Ultima voce fra le categorie, dopo le skill che arrivano da Sanity. */
export const OTHER_CATEGORY = "Non lo so, voglio che me lo diciate voi";

// Limiti dei campi, uguali su client (maxLength) e server (zod).
export const LIMITS = {
  nome: 100,
  email: 254,
  messaggio: 5000,
} as const;

// Sotto questo tempo dall'apertura della pagina l'invio e' quasi certamente
// automatico (audit §12.2).
export const MIN_FILL_MS = 3000;

// Categoria e tag sono obbligatori (asterisco nel form): stessi messaggi su
// client e server.
export const REQUIRED_MESSAGES = {
  categoria: "Scegli la categoria in cui rientra la tua idea.",
  tags: "Scegli almeno un elemento che ci sarà nella tua idea.",
} as const;
