// La pagina di dettaglio della skill non esiste piu': ogni skill porta al
// progetto che la rappresenta meglio. Chiave = slug della skill su Sanity,
// valore = slug del progetto. Usata dal menu e dai redirect dei vecchi URL
// `/skills/:slug` in `next.config.ts`.
export const SKILL_PROJECTS: Record<string, string> = {
  "product-conception": "frecciarossa-onboard-trolley",
  "ai-content-design": "campari-spritz-hologram",
  "virtual-immersive-worlds": "concept-campari-virtual-experience",
  "marketing-visualization": "nutella-croissant-shopper-journey",
  "3d-direction": "rain-digital-twin",
  "physical-experiences": "travel-lounge-concept",
};

/** Link del progetto associato alla skill, o `null` se non ne ha uno. */
export function skillProjectHref(skillSlug: string): string | null {
  const project = SKILL_PROJECTS[skillSlug];
  return project ? `/projects/${project}` : null;
}
