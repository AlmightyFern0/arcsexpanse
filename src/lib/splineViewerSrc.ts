// URL fissata (versione pinnata) del web component `<spline-viewer>`. Un solo
// posto: usata sia per il preload in `layout.tsx` sia per l'iniezione dello
// script nei componenti che montano scene Spline — deve restare identica in
// tutti e tre, o il preload non aggancia lo script vero.
//
// 2.0.43 e non più 1.12.98. La scena skill unificata è pubblicata nel formato
// 131, mentre 1.12.98 ne legge fino al 122: a ogni caricamento il runtime la
// convertiva all'indietro ("updating from 131 to 122" in console) e chiedeva
// esplicitamente di aggiornarsi. In più 1.12.98 compila gli shader in modo
// sincrono, mentre 2.0.43 precompila le pipeline con `compileAsync` prima di
// disegnare. Le API interne usate in `SplineStage` (`_skipRender`,
// `_debouncedResize`, `findObjectByName`, `getAllObjects`, `emitEvent*`,
// `unload`) sono state ricontrollate su questa versione: stessi nomi, e
// `_debouncedResize` ha la stessa forma, proprietà d'istanza con debounce di
// 10 ms. Chi alza di nuovo la versione deve rifare lo stesso controllo.
export const SPLINE_VIEWER_SRC =
  "https://unpkg.com/@splinetool/viewer@2.0.43/build/spline-viewer.js";
