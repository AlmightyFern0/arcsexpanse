import type { CSSProperties } from "react";

// Margini di pagina condivisi.
// Eccezioni: ProjectsGrid in home, "scopri tutte le nostre skill", Footer.
export const CONTENT_MAX_WIDTH = 1264;
export const CONTENT_PADDING_X = "2rem";

export const contentContainer: CSSProperties = {
  width: "100%",
  maxWidth: CONTENT_MAX_WIDTH,
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: CONTENT_PADDING_X,
  paddingRight: CONTENT_PADDING_X,
};
