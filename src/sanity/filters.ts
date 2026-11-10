// Filtri GROQ condivisi, senza dipendenze: li importa anche il middleware
// (runtime edge), che non deve tirarsi dietro `next-sanity`.

// Un progetto è pubblicato solo se è visibile *e* lo è la sua skill
// (`project.category` è un reference a skill, nonostante il nome).
export const PROJECT_VISIBLE = `_type == "project" && visible == true && category->visible != false`;
