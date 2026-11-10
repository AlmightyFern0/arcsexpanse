// Interruttore delle scene Spline (la scena skill in home). A `false` non si carica il viewer, non si prende un contesto WebGL e
// lo splash non aspetta niente — serve a isolare i crash su alcuni dispositivi,
// lasciando in piedi solo i canvas three.js.
export const SPLINE_ENABLED = true;
