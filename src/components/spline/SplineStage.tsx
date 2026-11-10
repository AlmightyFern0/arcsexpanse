"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { scheduleGlCreate, noteGlRelease } from "@/lib/glScheduler";
import { SplinePlaceholder } from "@/components/ui/SplinePlaceholder";
import { SPLINE_VIEWER_SRC } from "@/lib/splineViewerSrc";
import { registerPageReady } from "@/lib/pageReady";
import { warmGpuProfile } from "@/lib/renderQuality";

// Tetto oltre il quale il canvas si rivela comunque: senza, una scena rotta o
// dei gruppi rinominati lascerebbero lo splash appeso per sempre. È una rete di
// sicurezza, non un'attesa prevista: va tenuto largo, perché scattare prima che
// la scena sia pronta è esattamente ciò che fa vedere il caricamento a schermo.
const REVEAL_TIMEOUT_MS = 15000;

// Dissolvenza di comparsa del canvas. Il segnale di "pronto" arriva a
// dissolvenza finita, non al suo inizio: altrimenti lo splash si toglie mentre
// il canvas è ancora a metà, e la transizione si vede.
const FADE_MS = 400;

// A oggetti posizionati Spline sta ancora compilando shader e caricando
// texture, sul main thread. Manca un evento di "finito davvero", quindi si
// misura l'effetto: pronto quando i fotogrammi tornano dentro il budget.
const SMOOTH_FRAMES = 8;
const SMOOTH_FRAME_MS = 34;      // ~30fps
const SMOOTH_TIMEOUT_MS = 8000;  // tetto di sicurezza

// Scena delle sei skill: un solo contesto WebGL invece di sei, che era la causa
// dei crash da budget contesti esaurito.
//
// E' la variante leggera (~58k poligoni contro 565k, senza ombre), usata anche
// su desktop: pesa identico in rete e a ~242px di box la differenza non si
// vede. Quella pesante esisteva solo per essere scambiata a runtime, e lo
// scambio distruggeva e ricreava il viewer.
//
// I nomi dei gruppi devono restare allineati a `SKILL_GROUPS`, altrimenti il
// posizionamento non li trova e la sezione resta vuota.
export const SKILLS_SCENE_URL = "https://prod.spline.design/qmaLuJXJx4JvG7iy/scene.splinecode";

// Nomi dei gruppi dentro la scena unificata. Non derivano dalla chiave —
// `ai-content-design` sta sotto `AI-POWERED-CONTENT-DESIGN` — quindi mappa
// esplicita. Il `-trigger` di ogni gruppo è la hitbox del Mouse Hover: una Mesh
// senza figli, centrata sull'artwork, usata come punto di ancoraggio.
export const SKILL_GROUPS: Record<string, string> = {
  "product-conception": "PRODUCT-CONCEPTION",
  "ai-content-design": "AI-POWERED-CONTENT-DESIGN",
  "virtual-immersive-worlds": "VIRTUAL-IMMERSIVE-WORLDS",
  "marketing-visualization": "MARKETING-VISUALIZATION",
  "3d-direction": "3D-DIRECTION",
  "physical-experiences": "PHYSICAL-EXPERIENCES",
};

export interface SplineStageHandle {
  /** Chiave dello slot in hover, o null. Deve combaciare col prefisso
   * `${chiave}-trigger` dell'oggetto-hitbox dentro la scena Spline. */
  setHovered: (key: string | null) => void;
  /** Rettangoli (viewport) dei box che il 3D deve inseguire, così le posizioni
   * non vanno rifatte a mano in Spline a ogni ritocco di layout. */
  layoutSlots: (slots: { slug: string; rect: DOMRect }[]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SplineViewerEl = HTMLElement & { _spline?: any; unload?: () => void };

// ---------------------------------------------------------------------------
// Riuso del viewer fra una navigazione e l'altra.
//
// Il file della scena pesa 45 KB e il browser lo tiene in cache: non è il
// download a costare. A costare sono parse, costruzione del grafo,
// compilazione degli shader e caricamento di geometrie e texture sulla GPU —
// e quelli si rifanno da zero a ogni ritorno in home, perché uscendo si
// distrugge il viewer. Roba GPU non è "cacheabile": muore col contesto. L'unico
// modo di non ripagarla è non distruggerla.
//
// Quindi all'uscita il viewer viene staccato dal DOM e parcheggiato qui; al
// rientro si riattacca quello. Come effetto secondario sparisce un ciclo
// crea/distruggi contesto, che è esattamente il thrash di memoria video su cui
// cade il driver AMD dei Mac Intel.
// ---------------------------------------------------------------------------

interface PoolEntry {
  viewer: SplineViewerEl;
  /** Stato del solutore. Appartiene agli oggetti della scena, non al
   * componente: se sopravvive il viewer deve sopravvivere anche questo. */
  baseline: Map<string, Vec3>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anchorObj: Map<string, any>;
  anchorState: Map<string, Vec3>;
}

const pool = new Map<string, PoolEntry>();

/** Quante scene restano vive fra una navigazione e l'altra. Ognuna trattiene un
 * contesto WebGL e la propria memoria video per tutta la sessione. Ne serve
 * una: la scena skill della home, l'unica che si ripaga a ogni ritorno. */
const POOL_LIMIT = 1;

/** Se un viewer non sopravvive allo stacco dal DOM si smette di riusarli per il
 * resto della sessione, invece di riprovarci a ogni navigazione. */
let poolingBroken = false;

/** Quanto prima della sezione far partire la costruzione della scena. Un
 * viewport intero: il lavoro sincrono cade mentre l'utente sta ancora
 * scrollando verso il basso, fuori campo, invece che nell'istante in cui la
 * scena entra a schermo. */
const ARM_MARGIN = "100% 0px";

const poolKey = (sceneUrl: string, downscale: number): string =>
  `${sceneUrl}|${downscale}`;

function createViewer(sceneUrl: string, downscale: number): SplineViewerEl {
  const viewer = document.createElement("spline-viewer") as SplineViewerEl;
  // Ripubblicando da Spline il contenuto cambia ma l'URL no, e il server non
  // manda `cache-control`: i browser tengono la copia vecchia e le modifiche
  // sembrano non essere state applicate. In sviluppo si forza il ricarico con
  // un parametro sempre diverso; in produzione la cache va lasciata fare.
  const url =
    process.env.NODE_ENV === "development"
      ? `${sceneUrl}?t=${Date.now()}`
      : sceneUrl;
  viewer.setAttribute("url", url);
  // Senza questo il viewer aspetta di entrare nel viewport prima di scaricare
  // la scena: sopra la piega non parte mai, e chi aspetta il segnale di
  // "pronto" — il PageLoader — resta appeso fino al proprio timeout.
  viewer.setAttribute("loading", "eager");
  viewer.style.width = `${100 / downscale}%`;
  viewer.style.height = `${100 / downscale}%`;
  if (downscale !== 1) {
    viewer.style.transformOrigin = "top left";
    viewer.style.transform = `scale(${downscale})`;
  }
  // Nessun pointer nativo: l'hover arriva via emitEvent dalle hover-zone
  // HTML sopra, il canvas resta puramente visivo.
  viewer.style.pointerEvents = "none";
  viewer.style.transition = `opacity ${FADE_MS}ms ease`;
  return viewer;
}

/** Scarica la scena e libera il contesto. Il viewer va già staccato dal DOM. */
function releaseViewer(viewer: SplineViewerEl): void {
  // `unload()` azzera `_spline.data`. Con la scena ancora in caricamento la
  // continuazione asincrona della libreria ci accede subito dopo, fuori da
  // qualunque try/catch: per questo si salta finche' la scena non e' su.
  const loaded = (viewer._spline?.getAllObjects?.()?.length ?? 0) > 0;
  if (loaded) {
    try {
      viewer.unload?.();
    } catch {
      /* not loaded */
    }
  }

  // Il contesto lo libera `loseContext()` — ma finche' la scena carica il
  // canvas non e' ancora nello shadow root, quindi non c'e' niente su cui
  // chiamarlo: proprio nel caso in cui `unload()` e' stato saltato non
  // veniva liberato nulla, e ogni ricreazione lasciava indietro un contesto
  // WebGL con la sua scena in memoria GPU. Chrome ne tiene sedici, poi
  // comincia a uccidere i piu' vecchi; su macOS il conto lo paga l'intera
  // macchina.
  //
  // Quindi: si prova subito e, se il canvas non c'e' ancora, si resta in
  // ascolto sullo shadow root finche' non compare. Il viewer e' gia'
  // staccato dal DOM a quel punto, ma il caricamento in volo lo raggiunge
  // comunque ed e' li' che il canvas nasce.
  const release = (): boolean => {
    try {
      const canvas = viewer.shadowRoot?.querySelector("canvas");
      if (!canvas) return false;
      const gl =
        (canvas.getContext("webgl2") as WebGLRenderingContext | null) ||
        (canvas.getContext("webgl") as WebGLRenderingContext | null);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      // Il prossimo contesto aspetta che questo sia davvero sparito.
      noteGlRelease();
      return true;
    } catch {
      // Contesto gia' andato: niente da liberare, ma non c'e' da riprovare.
      return true;
    }
  };

  if (release()) return;

  const root = viewer.shadowRoot;
  if (!root) return;
  // Tetto: se la scena non arriva mai, l'osservatore non deve restare appeso
  // per tutta la vita della pagina.
  const GIVE_UP_MS = 30000;
  const mo = new MutationObserver(() => {
    if (release()) {
      mo.disconnect();
      clearTimeout(giveUp);
    }
  });
  mo.observe(root, { childList: true, subtree: true });
  const giveUp = setTimeout(() => mo.disconnect(), GIVE_UP_MS);
}

/** Ritira dal parcheggio il viewer per questa scena, se c'è ed è ancora vivo. */
function takePooled(key: string): PoolEntry | null {
  const entry = pool.get(key);
  if (!entry) return null;
  pool.delete(key);

  // Staccare un canvas dal DOM non gli fa perdere il contesto WebGL, ma
  // `disconnectedCallback` del custom element è codice di Spline che non
  // controlliamo: se in una versione futura smonta la scena, qui ce ne
  // accorgiamo e si riparte da zero invece di riattaccare un canvas nero.
  const alive =
    (entry.viewer._spline?.getAllObjects?.()?.length ?? 0) > 0 &&
    !!entry.viewer.shadowRoot?.querySelector("canvas");

  if (!alive) {
    poolingBroken = true;
    console.warn("[spline] il viewer non sopravvive allo stacco: riuso disattivato");
    releaseViewer(entry.viewer);
    return null;
  }

  // Riprende a disegnare: era stato messo in pausa nel parcheggio.
  const app = entry.viewer._spline;
  if (app && "_skipRender" in app) {
    app._skipRender = false;
    app.requestRender?.();
  }
  return entry;
}

/** Parcheggia il viewer per la prossima visita. */
function park(key: string, entry: PoolEntry): void {
  // Due istanze sulla stessa scena: si tiene quella già parcheggiata e si
  // libera la nuova, altrimenti la sovrascrittura perderebbe un contesto.
  if (poolingBroken || pool.has(key)) {
    releaseViewer(entry.viewer);
    return;
  }

  pool.set(key, entry);

  // Staccata dal DOM la scena continuerebbe a disegnare a 60fps per tutto il
  // tempo passato sulle altre pagine. La pausa va imposta *dopo* che sono
  // passate tutte le cleanup di questo smontaggio: quella del ciclo di
  // sospensione rimette `_skipRender` a false, e gira dopo questa.
  queueMicrotask(() => {
    const app = entry.viewer._spline;
    if (app && "_skipRender" in app) app._skipRender = true;
  });

  while (pool.size > POOL_LIMIT) {
    const oldest = pool.keys().next().value;
    if (oldest === undefined) break;
    const evicted = pool.get(oldest);
    pool.delete(oldest);
    if (evicted) releaseViewer(evicted.viewer);
  }
}

/** Spline mette `matrixAutoUpdate = false` sugli oggetti statici: senza questo
 * ricalcolo, scrivere position/scale non produce alcun effetto a schermo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function commitTransform(obj: any): void {
  obj.matrixAutoUpdate = true;
  obj.updateMatrix?.();
  obj.updateMatrixWorld?.(true);
}

/** Vero se il canvas del viewer misura zero su un lato: succede a viewer
 * staccato dal DOM, cioè parcheggiato. Senza canvas riconoscibile torna false,
 * così si ricade nel comportamento normale invece di bloccare ogni resize. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function canvasIsEmpty(app: any): boolean {
  const canvas = app?.canvas;
  return (
    canvas instanceof HTMLCanvasElement &&
    (canvas.clientWidth === 0 || canvas.clientHeight === 0)
  );
}

/** La camera esposta da Spline ha `type: "Camera"`, non i flag di three.js: va
 * riconosciuta dalla forma (top/bottom = ortografica, fov = prospettica). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveCamera(app: any): any {
  const isCam = (c: unknown): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = c as any;
    return !!o && (typeof o.fov === "number" || (typeof o.top === "number" && typeof o.bottom === "number"));
  };

  for (const c of [app?._camera, app?.camera, app?._camera?.camera, app?._scene?.camera]) {
    if (isCam(c)) return c;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let found: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app?._scene?.traverse?.((o: any) => {
    if (!found && (o?.isCamera || isCam(o))) found = o;
  });
  return found;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matrixWorldOf(obj: any): number[] | null {
  const e = obj?.matrixWorld?.elements;
  return e && e.length >= 16 ? e : null;
}

/** Posizione mondo dalla colonna di traslazione di `matrixWorld`, che include
 * rotazioni e scale di tutti gli antenati. La somma delle sole `position` lungo
 * la catena le ignorerebbe, e in una scena scalata come questa sbaglia di
 * parecchio. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function worldPos(obj: any): Vec3 | null {
  const e = matrixWorldOf(obj);
  if (e) return { x: e[12], y: e[13], z: e[14] };
  if (!obj?.position) return null;
  return { x: obj.position.x ?? 0, y: obj.position.y ?? 0, z: obj.position.z ?? 0 };
}

/** Direzioni mondo degli assi X e Y **locali** dell'oggetto: sono le colonne
 * della matrice del suo parent. Servono a sapere di quanto si sposta nel mondo
 * un incremento di `position.x` / `position.y`, senza doverlo provare davvero. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function localAxesInWorld(obj: any): { ax: Vec3; ay: Vec3 } {
  const e = matrixWorldOf(obj?.parent);
  if (!e) return { ax: { x: 1, y: 0, z: 0 }, ay: { x: 0, y: 1, z: 0 } };
  return { ax: { x: e[0], y: e[1], z: e[2] }, ay: { x: e[4], y: e[5], z: e[6] } };
}

/** Applica una Matrix4 three.js (elements in column-major) a un punto omogeneo. */
function applyMat4(e: number[], x: number, y: number, z: number, w: number) {
  return {
    x: e[0] * x + e[4] * y + e[8] * z + e[12] * w,
    y: e[1] * x + e[5] * y + e[9] * z + e[13] * w,
    z: e[2] * x + e[6] * y + e[10] * z + e[14] * w,
    w: e[3] * x + e[7] * y + e[11] * z + e[15] * w,
  };
}

type Projector = { project: (p: Vec3) => { x: number; y: number } };

/** Derivata dei pixel schermo rispetto alle unità locali del gruppo. */
interface Jacobian { a: number; b: number; c: number; d: number }

/** Da coordinate mondo a px sul canvas. Due strade, in ordine di precisione:
 * le matrici della camera se esposte, altrimenti il modello ortografico
 * ricavato da top/bottom/zoom. Nessuna dipendenza dai metodi di three.js, che
 * le classi Spline non garantiscono. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeProjector(cam: any, canvas: HTMLCanvasElement): Projector | null {
  const box = canvas.getBoundingClientRect();
  const w = box.width;
  const h = box.height;
  if (w <= 0 || h <= 0) return null;

  const view = cam?.matrixWorldInverse?.elements;
  const proj = cam?.projectionMatrix?.elements;
  if (view?.length >= 16 && proj?.length >= 16) {
    return {
      project: (p) => {
        const v = applyMat4(view, p.x, p.y, p.z, 1);
        const c = applyMat4(proj, v.x, v.y, v.z, v.w);
        const iw = c.w || 1;
        return { x: (c.x / iw * 0.5 + 0.5) * w, y: (-c.y / iw * 0.5 + 0.5) * h };
      },
    };
  }

  const frustum = (cam?.top ?? 0) - (cam?.bottom ?? 0);
  if (frustum > 0) {
    const k = (h * (cam.zoom ?? 1)) / frustum;
    const camPos = worldPos(cam) ?? { x: 0, y: 0, z: 0 };
    return {
      project: (p) => ({ x: w / 2 + (p.x - camPos.x) * k, y: h / 2 - (p.y - camPos.y) * k }),
    };
  }
  return null;
}

/** Porta la scala del gruppo a `factor` volte quella autorata in Spline.
 *
 * Il fattore è per skill e non globale: gruppi con la stessa scala in Spline
 * possono comparire di dimensioni diverse — la scala è un moltiplicatore sulla
 * geometria, e con camera prospettica pesa anche la distanza dalla camera.
 *
 * Si ricalcola sempre dalla baseline, mai moltiplicando la scala corrente:
 * `applyLayout` gira a ogni frame di scroll, e un fattore applicato in modo
 * incrementale esploderebbe in pochi secondi.
 *
 * Restituisce la nuova posizione dell'ancora, che la scalatura sposta insieme
 * al gruppo: `matrixWorld` qui è ancora quella del frame precedente. */
function scaleGroup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any,
  anchor: Vec3 | null,
  slug: string,
  baseline: Map<string, Vec3>,
  factor: number
): Vec3 | null {
  if (!obj?.scale) return anchor;

  let base = baseline.get(slug);
  if (!base) {
    base = { x: obj.scale.x ?? 1, y: obj.scale.y ?? 1, z: obj.scale.z ?? 1 };
    baseline.set(slug, base);
  }

  const current = obj.scale.x || 1;
  const wanted = base.x * factor;
  if (!Number.isFinite(wanted) || wanted <= 0) return anchor;

  const ratio = wanted / current;
  if (!Number.isFinite(ratio) || Math.abs(ratio - 1) < 1e-4) return anchor;

  obj.scale.x = base.x * factor;
  obj.scale.y = base.y * factor;
  obj.scale.z = base.z * factor;
  commitTransform(obj);

  // La scalatura avviene attorno al pivot: l'ancora si allontana da quel punto
  // nella stessa proporzione.
  const pivot = worldPos(obj);
  if (!anchor || !pivot) return anchor;
  return {
    x: pivot.x + (anchor.x - pivot.x) * ratio,
    y: pivot.y + (anchor.y - pivot.y) * ratio,
    z: pivot.z + (anchor.z - pivot.z) * ratio,
  };
}

/** La hitbox `${slug}-trigger` è centrata sull'artwork, quindi è l'ancora
 * ideale — purché sia dentro il gruppo, altrimenti spostare il gruppo non la
 * muove. Si cerca scendendo nell'albero del gruppo invece di risalire i parent
 * da `findObjectByName`: quello restituisce un wrapper la cui identità non
 * combacia mai con i nodi dell'albero. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findAnchorObject(group: any, slug: string): any {
  if (typeof group?.traverse !== "function") return null;
  const wanted = `${slug}-trigger`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let found: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group.traverse((child: any) => {
    if (!found && child !== group && child?.name === wanted) found = child;
  });
  return found;
}

/** Punto da portare sul centro della card. Con un'ancora esplicita è il suo
 * centro; senza, si approssima l'ingombro del gruppo con le posizioni dei
 * discendenti — il pivot da solo non basta, in Spline può stare ovunque. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anchorWorld(obj: any, anchorObj: any): Vec3 | null {
  if (anchorObj) return worldPos(anchorObj);
  if (typeof obj.traverse !== "function") return worldPos(obj);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj.traverse((child: any) => {
    const p = worldPos(child);
    if (!p) return;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return worldPos(obj);
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
}

/** Sposta l'oggetto finché il suo centro visivo non cade su (targetX, targetY),
 * in px rispetto al canvas.
 *
 * Non serve conoscere px/unità: si sonda l'oggetto muovendolo di una quantità
 * nota lungo X e lungo Y — separatamente, perché con una camera ruotata muovere
 * in Y sposta anche in X a schermo — e si risolve il sistema 2×2 risultante.
 * Vale per ortografica e prospettica, a qualunque profondità, e si riadatta da
 * sé a ogni resize. La seconda passata assorbe il residuo della prospettiva. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function centerOnPx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anchorObj: any,
  projector: Projector,
  targetX: number,
  targetY: number,
  /** Posizione mondo dell'ancora secondo il chiamante. Va passata sempre dopo
   * il primo giro: `matrixWorld` riflette il frame precedente, e rileggerla
   * dopo aver già scritto una posizione fa riapplicare la stessa correzione. */
  anchorStart?: Vec3 | null,
  /** Iterazioni di Newton. Due servono solo al primo posizionamento: la seconda
   * assorbe il residuo della prospettiva partendo da lontano. A regime, con
   * l'ancora già convergente e uno spostamento di pochi pixel per frame, la
   * prima passata basta — e durante lo scroll dimezza il lavoro. */
  passes = 2,
  /** Jacobiana px-schermo / unità-locali già nota. Dipende solo da camera,
   * dimensione del canvas e trasformazione del genitore: durante lo scroll non
   * cambia nessuna delle tre, quindi ricalcolarla a ogni frame è lavoro
   * sprecato. Se passata, si saltano due proiezioni per gruppo per frame. */
  cachedJ?: Jacobian | null,
  /** Riceve la jacobiana calcolata, per poterla riusare al giro dopo. */
  onJacobian?: (j: Jacobian) => void
): { error: string; anchor?: undefined } | { error: null; anchor: Vec3 } {
  const PROBE_UNITS = 50;

  let anchor = anchorStart ?? anchorWorld(obj, anchorObj);
  if (!anchor) return { error: "posizione mondo non leggibile" };
  const { ax, ay } = localAxesInWorld(obj);

  for (let pass = 0; pass < passes; pass += 1) {
    // La sonda è aritmetica, non fisica: sappiamo già in che direzione mondo si
    // muove l'ancora al variare di position.x/.y, quindi non serve spostare
    // l'oggetto e rileggere — cosa che richiederebbe di aspettare che l'engine
    // ricalcoli le matrici.
    const p0 = projector.project(anchor);

    let a: number, b: number, c: number, d: number;
    if (cachedJ) {
      ({ a, b, c, d } = cachedJ);
    } else {
      const px = projector.project({
        x: anchor.x + ax.x * PROBE_UNITS, y: anchor.y + ax.y * PROBE_UNITS, z: anchor.z + ax.z * PROBE_UNITS,
      });
      const py = projector.project({
        x: anchor.x + ay.x * PROBE_UNITS, y: anchor.y + ay.y * PROBE_UNITS, z: anchor.z + ay.z * PROBE_UNITS,
      });
      a = (px.x - p0.x) / PROBE_UNITS; b = (py.x - p0.x) / PROBE_UNITS;
      c = (px.y - p0.y) / PROBE_UNITS; d = (py.y - p0.y) / PROBE_UNITS;
      onJacobian?.({ a, b, c, d });
    }
    const det = a * d - b * c;
    if (!det) return { error: `jacobiana singolare (a=${a.toFixed(4)} b=${b.toFixed(4)})` };

    const ex = targetX - p0.x;
    const ey = targetY - p0.y;
    const du = (ex * d - b * ey) / det;
    const dv = (a * ey - ex * c) / det;

    obj.position.x += du;
    obj.position.y += dv;
    commitTransform(obj);

    // L'ancora si sposta con il gruppo: la aggiorniamo noi invece di rileggerla
    // dalle matrici, che a questo punto del frame sono ancora quelle vecchie.
    anchor = {
      x: anchor.x + ax.x * du + ay.x * dv,
      y: anchor.y + ax.y * du + ay.y * dv,
      z: anchor.z + ax.z * du + ay.z * dv,
    };
  }
  return { error: null, anchor };
}

interface SplineStageProps {
  /** Scena `.splinecode` da caricare. */
  sceneUrl: string;
  /** Mappa chiave-slot → nome del gruppo dentro la scena Spline. */
  groups: Record<string, string>;
  /** Il genitore deve rimandare le misure dei box. Chiamato a scena caricata e
   * a ogni ridimensionamento dello stage: in entrambi i casi i rect vanno
   * riletti, e l'ordine di mount dei ref non deve contare. */
  onNeedsMeasure?: () => void;
  /** Divisore della risoluzione di rendering.
   *
   * Il viewer viene creato a `1/downscale` e riportato a dimensione piena con
   * una scalatura CSS: il buffer WebGL scende col quadrato del fattore, mentre
   * l'ingrandimento lo fa la GPU in composizione, che costa quanto ingrandire
   * un'immagine. È l'unico modo di abbassare la risoluzione di Spline — il suo
   * renderer non espone il pixel ratio.
   *
   * Riferimento: gli artwork stanno in box da 242px CSS. Su uno schermo a
   * densità 3, `downscale: 3` porta a un pixel reale per pixel CSS, cioè la
   * densità di un monitor desktop. Oltre si scende sotto e la sgranatura si
   * vede.
   *
   * Il posizionamento non ne risente: legge il rettangolo *visivo* del canvas,
   * che la scalatura CSS lascia coerente. */
  downscale?: number;
  /** Riposiziona anche durante lo scroll. Necessario quando il canvas è
   * ancorato al viewport invece di scorrere con i box: lì il rapporto fra i due
   * cambia a ogni pixel di scroll. Dove il canvas scorre insieme ai box va
   * lasciato spento, sarebbe lavoro sprecato a ogni frame. */
  followScroll?: boolean;
  /** Scala per chiave-slot, come multiplo di quella autorata in Spline. Le
   * chiavi mancanti restano a 1. È per skill perché la stessa scala in Spline
   * non dà la stessa dimensione a schermo su geometrie diverse. */
  scales?: Record<string, number>;
  /** Gruppi da spegnere: la scena è condivisa fra sezioni, e ciascuna mostra
   * solo i propri. Si applica una volta a scena caricata. */
  hiddenGroups?: string[];
  /** Notifica quando gli artwork sono a schermo e al loro posto. Torna a
   * `false` a ogni scambio di scena — desktop/mobile — perché li' ricomincia
   * tutto: download, parse, compilazione shader. Serve al genitore per tenere
   * un'attesa visibile nei box finche' non c'e' niente da mostrare. */
  onReadyChange?: (ready: boolean) => void;
  /** Se lo splash di pagina può aspettare questa scena prima di scoprire.
   *
   * Vale solo a scena da costruire: quando se ne riprende una dal parcheggio si
   * scopre subito comunque, perché non c'è niente da aspettare. Vedi
   * `blocking` dentro il componente. */
  blocksSplash?: boolean;
}

const SplineStage = forwardRef<SplineStageHandle, SplineStageProps>(function SplineStage(
  {
    sceneUrl,
    groups,
    onNeedsMeasure,
    hiddenGroups,
    scales,
    onReadyChange,
    followScroll = false,
    downscale = 1,
    blocksSplash = true,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<SplineViewerEl | null>(null);
  const activeTriggerRef = useRef<string | null>(null);

  // Il viewer — e con lui il suo contesto WebGL — nasce quando lo concede la
  // coda di `glScheduler`, non al mount.
  //
  // Il contesto nasce quando la sezione si avvicina, non al caricamento pagina.
  //
  // Era stato anticipato di proposito: costruire la scena è lavoro sincrono —
  // parse, compilazione shader, upload di geometrie e texture — e farlo mentre
  // l'utente scrolla fin qui produce un freeze che si vede. Pagarlo dietro lo
  // splash lo nascondeva.
  //
  // Ma pagarlo lì significa allocare il contesto Spline a ridosso di quello
  // dell'hero, e sono proprio le due allocazioni ravvicinate a far cadere il
  // driver AMD dei Mac Intel. Un freeze si vede; un crash chiude la scheda.
  // Fra i due si sceglie il freeze.
  //
  // `ARM_MARGIN` lo attenua: la costruzione parte un viewport prima, quindi il
  // blocco del thread cade durante lo scroll e non quando la scena arriva a
  // schermo. E le due allocazioni finiscono distanti quanto ci mette l'utente
  // ad arrivare alle skill — molto più dei 250 ms della coda di `glScheduler`.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancel: (() => void) | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // Una volta sola: la scena non si ricostruisce a ogni rientro.
        observer.disconnect();
        warmGpuProfile();
        cancel = scheduleGlCreate(() => setArmed(true));
      },
      { rootMargin: ARM_MARGIN }
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancel?.();
    };
  }, []);

  // Lo splash aspetta questa scena solo se va costruita da zero.
  //
  // Costruirla significa parse, compilazione shader e upload di geometrie e
  // texture: lavoro sincrono che inchioda il thread principale per un pezzo. Se
  // succede a schermo scoperto si vede — le forme dell'hero smettono di ruotare
  // e ripartono quando il thread si libera. Dietro lo splash invece non lo vede
  // nessuno, ed è il posto giusto per pagarlo: una volta per sessione.
  //
  // Riprendendo un viewer dal parcheggio quel lavoro non c'è: la scena è già
  // costruita e sulla GPU. Lì aspettare sarebbe solo tempo buttato, ed è il
  // caso del ritorno in home da una pagina progetto — quello che si paga a ogni
  // navigazione e che deve restare immediato.
  const [blocking] = useState(
    () => blocksSplash && !pool.has(poolKey(sceneUrl, downscale))
  );

  useEffect(() => {
    if (document.querySelector(`script[src="${SPLINE_VIEWER_SRC}"]`)) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = SPLINE_VIEWER_SRC;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const container = containerRef.current;
    if (!container) return;

    const key = poolKey(sceneUrl, downscale);
    const pooled = takePooled(key);
    const viewer = pooled?.viewer ?? createViewer(sceneUrl, downscale);

    // Invisibile finché i gruppi non sono al loro posto: appena caricata, la
    // scena dipinge gli oggetti dove li ha messi il cliente in Spline, e il
    // salto verso la posizione calcolata si vedrebbe. Vale anche al rientro:
    // il canvas può essere cambiato di dimensione mentre eravamo altrove.
    viewer.style.opacity = "0";
    container.appendChild(viewer);
    viewerRef.current = viewer;

    // Stato azzerato a ogni mount. Senza, passando fra la scena desktop e
    // quella mobile il viewer veniva ricreato ma tutto il resto restava
    // convinto di aver gia' finito: `positioned` era ancora vero, quindi
    // l'effetto che porta l'opacita' a 1 non ri-scattava e il viewer nuovo —
    // creato a `opacity: 0` — restava invisibile per sempre.
    positionedRef.current = false;
    setPositioned(false);
    setSceneReady(false);

    if (pooled) {
      // Scala e ancore descrivono gli oggetti della scena, e quella scena è
      // ancora viva: vanno riprese, non azzerate. Ripartire da mappe vuote su
      // gruppi già scalati farebbe registrare come baseline la scala corrente,
      // e `scaleGroup` riapplicherebbe il fattore sopra sé stesso — è
      // esattamente il caso che fa esplodere le dimensioni in pochi secondi.
      baselineRef.current = pooled.baseline;
      anchorObjRef.current = pooled.anchorObj;
      anchorStateRef.current = pooled.anchorState;
    } else {
      anchorObjRef.current.clear();
      anchorStateRef.current.clear();
      baselineRef.current.clear();
    }

    // Le jacobiane dipendono dalla dimensione del canvas, che mentre eravamo
    // altrove può essere cambiata: si rifanno sempre.
    jacobianRef.current.clear();
    jacobianCanvasRef.current = "";
    lastLayoutKeyRef.current = "";
    lastGeometryRef.current = "";
    settleStartRef.current = 0;
    reconvergeRef.current = 0;

    return () => {
      if (viewer.parentElement === container) container.removeChild(viewer);
      viewerRef.current = null;

      // Parcheggiato, non distrutto: ricrearlo significa riparsare la scena,
      // ricompilare gli shader e ricaricare geometrie e texture sulla GPU a
      // ogni ritorno in home. `park` lo libera davvero se il riuso è
      // disattivato o se qualcun altro tiene già il posto.
      park(key, {
        viewer,
        baseline: baselineRef.current,
        anchorObj: anchorObjRef.current,
        anchorState: anchorStateRef.current,
      });
    };
    // Cambiare scena o risoluzione prende un viewer diverso dal parcheggio, e
    // quello vecchio ci torna dentro. In pratica sono costanti per sezione.
  }, [armed, sceneUrl, downscale]);

  // Vero quando i gruppi sono stati posizionati almeno una volta: solo allora
  // il canvas si rivela e lo splash può andarsene.
  const [positioned, setPositioned] = useState(false);
  const positionedRef = useRef(false);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) viewer.style.opacity = positioned ? "1" : "0";
  }, [positioned]);

  useEffect(() => {
    onReadyChange?.(positioned);
  }, [positioned, onReadyChange]);

  // Il PageLoader aspetta le scene registrate qui. Registriamo a mano invece di
  // affidarci a `useSplineReady`, che segnala pronto appena esiste `_spline` —
  // cioè a scena ancora vuota e con gli oggetti non ancora posizionati: lo
  // splash spariva prima, ed era lì che si vedeva il salto.
  const markReadyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Chi non blocca lo splash non si registra proprio: `total` non deve
    // contarla, o il loader la aspetterebbe comunque.
    const tracked = blocking ? registerPageReady() : null;
    markReadyRef.current = tracked?.markReady ?? null;

    // Rete di sicurezza: se il posizionamento non arriva (scena rotta, gruppi
    // rinominati) lo splash non deve restare appeso, e il canvas non deve
    // restare invisibile per sempre. Vale anche senza registrazione: la
    // rivelazione del canvas non dipende dallo splash.
    const timeout = setTimeout(() => {
      tracked?.markReady();
      if (!positionedRef.current) {
        positionedRef.current = true;
        setPositioned(true);
      }
    }, REVEAL_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      markReadyRef.current = null;
      tracked?.unregister();
    };
  }, [blocking]);

  // Serve solo a decidere quando dichiararsi pronti allo splash: senza
  // registrazione è un ciclo rAF che gira per nulla, fino a otto secondi.
  useEffect(() => {
    if (!positioned || !blocking) return;

    let raf = 0;
    let smooth = 0;
    const started = performance.now();
    let last = started;

    const tick = () => {
      const now = performance.now();
      const delta = now - last;
      last = now;

      // Un fotogramma lungo azzera il conteggio.
      smooth = delta <= SMOOTH_FRAME_MS ? smooth + 1 : 0;

      const elapsed = now - started;
      // La dissolvenza del canvas deve comunque completarsi.
      const faded = elapsed >= FADE_MS;

      if ((faded && smooth >= SMOOTH_FRAMES) || elapsed > SMOOTH_TIMEOUT_MS) {
        markReadyRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [positioned, blocking]);

  // La scena è caricata solo quando `getAllObjects()` restituisce contenuto:
  // `_spline` compare già alla registrazione del custom element, a scena vuota.
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const POLL_MS = 250;
    const MAX_ATTEMPTS = 120; // ~30s

    const poll = () => {
      if (cancelled) return;
      const app = viewerRef.current?._spline;
      const count = app?.getAllObjects?.()?.length ?? 0;
      if (count > 0) {
        setSceneReady(true);
        return;
      }
      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        console.warn(`[spline] scena ancora vuota dopo ${(MAX_ATTEMPTS * POLL_MS) / 1000}s`);
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Le stesse dipendenze che ricreano il viewer: con `[]` il polling girava
    // una volta sola, e dopo uno scambio di scena `sceneReady` restava fermo al
    // valore di prima — quindi tutti gli effetti che ne dipendono (assestamento
    // compreso) non ripartivano mai per la scena nuova.
  }, [sceneUrl, downscale]);

  // Centraggio: porta ogni gruppo 3D sul centro del box icona della sua card.
  const slotsRef = useRef<{ slug: string; rect: DOMRect }[]>([]);

  // L'oggetto-ancora non cambia mai per un dato gruppo: cercarlo significa
  // percorrere tutto il sottoalbero, e a ogni frame di scroll erano sei
  // attraversamenti buttati.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anchorObjRef = useRef(new Map<string, any>());

  // Firma di canvas + box: se nulla si è mosso non c'è niente da riposizionare.
  const lastLayoutKeyRef = useRef("");

  // Iterazioni ancora dovute al solutore dopo un cambio di geometria. A gruppo
  // convergiato `applyLayout` ne fa una per chiamata: basta trascinando il
  // bordo, non con un salto istantaneo, dove la geometria si assesta in tre
  // frame e il guard sulla chiave blocca il resto — gruppi lasciati spostati.
  const reconvergeRef = useRef(0);

  // Insieme di slot per cui abbiamo già spento i gruppi orfani.
  const orphanKeyRef = useRef("");

  // Scena nuova, oggetti nuovi: gli spegnimenti vanno rifatti.
  useEffect(() => {
    orphanKeyRef.current = "";
  }, [sceneUrl, downscale]);

  // Scala di ogni gruppo com'era prima che la toccassimo, per slug.
  const baselineRef = useRef(new Map<string, Vec3>());

  // Jacobiana per gruppo, valida finché il canvas non cambia dimensione.
  const jacobianRef = useRef(new Map<string, Jacobian>());
  const jacobianCanvasRef = useRef("");

  // Posizione mondo dell'ancora di ogni gruppo secondo noi. `matrixWorld` è
  // aggiornata dall'engine al frame successivo: rileggerla dopo aver già
  // scritto una posizione restituisce quella vecchia, e la correzione viene
  // riapplicata su sé stessa. Su desktop il layout girava una volta sola e non
  // si notava; su mobile gira a ogni frame di scroll e l'errore si accumula
  // finché l'oggetto esce dallo schermo.
  const anchorStateRef = useRef(new Map<string, Vec3>());

  // Vero mentre il bordo della finestra e' in movimento.
  //
  // Il viewer di Spline rialloca il framebuffer a ogni fotogramma del
  // trascinamento (`_debouncedResize` ha un debounce di 10ms e in un ramo chiama
  // `setSize` due volte): su questo stage sono ~20 Mpx, ed e' il thrash di
  // memoria video che fa cadere il driver AMD su macOS. Qui la chiamata viene
  // ingoiata e rieseguita una volta sola a bordo fermo; nel frattempo il
  // browser stira il buffer vecchio, che costa come scalare un'immagine.
  const frozenRef = useRef(false);
  const pendingResizeRef = useRef(false);
  // `_debouncedResize` originale, gia' legata all'istanza.
  const resumeResizeRef = useRef<(() => void) | null>(null);

  const applyLayout = useCallback(() => {
    // A canvas stirato la proiezione sarebbe sbagliata: si aspetta lo sgelo.
    if (frozenRef.current) return;
    const viewer = viewerRef.current;
    const app = viewer?._spline;
    const container = containerRef.current;
    if (!app || !container || typeof app.findObjectByName !== "function") return;

    // Gruppi presenti nella scena ma senza card: nascosti da Sanity. Nessuno li
    // posiziona, quindi senza questo restano dove li ha messi Spline.
    const slugs = new Set(slotsRef.current.map((s) => s.slug));
    if (slugs.size > 0) {
      const orphanKey = [...slugs].sort().join(",");
      if (orphanKey !== orphanKeyRef.current) {
        orphanKeyRef.current = orphanKey;
        for (const [key, name] of Object.entries(groups)) {
          if (slugs.has(key)) continue;
          const obj = app.findObjectByName(name);
          if (obj) obj.visible = false;
        }
      }
    }

    const canvas = viewer?.shadowRoot?.querySelector("canvas");
    if (!canvas) return;

    const cam = resolveCamera(app);
    const projector = cam && makeProjector(cam, canvas);
    if (!projector) {
      console.warn("[spline] proiezione non costruibile: layout 3D saltato");
      return;
    }

    // I rect sono relativi al viewport, la proiezione al canvas.
    const canvasBox = canvas.getBoundingClientRect();

    // Durante lo scroll il canvas è ancorato al viewport e i box gli scorrono
    // davanti: se né l'uno né gli altri si sono mossi rispetto all'ultimo giro,
    // rifare il calcolo produrrebbe le stesse identiche posizioni.
    const key =
      `${canvasBox.left}|${canvasBox.top}|${canvasBox.width}|${canvasBox.height}|` +
      slotsRef.current.map((s) => `${s.slug}:${s.rect.top}:${s.rect.left}`).join(",");
    // A riconvergenza in corso si passa comunque: la chiave e' ferma perche' e'
    // fermo il bersaglio, non perche' ci siamo arrivati.
    const forced = reconvergeRef.current > 0;
    if (!forced && key === lastLayoutKeyRef.current) return;
    if (forced) reconvergeRef.current -= 1;
    lastLayoutKeyRef.current = key;

    // Le jacobiane dipendono dalla dimensione del canvas, non dallo scroll.
    const canvasKey = `${canvasBox.width}x${canvasBox.height}`;
    if (canvasKey !== jacobianCanvasRef.current) {
      jacobianCanvasRef.current = canvasKey;
      jacobianRef.current.clear();
    }

    let placed = 0;


    for (const { slug, rect } of slotsRef.current) {
      const name = groups[slug];
      const obj = name ? app.findObjectByName(name) : null;
      if (!obj?.position) {
        console.warn(`[spline] gruppo "${name ?? slug}" non trovato`);
        continue;
      }

      const targetX = rect.left + rect.width / 2 - canvasBox.left;
      const targetY = rect.top + rect.height / 2 - canvasBox.top;

      // Fuori dal canvas non si posiziona: si nasconde. Su mobile il canvas è
      // alto quanto il viewport mentre la colonna di card supera i 2000px, e
      // inseguire un bersaglio centinaia di pixel sotto il bordo significa
      // spedire il gruppo a decine di migliaia di unità dalla camera — fuori
      // dal frustum, dove viene scartato e non torna più. Il margine di una
      // card evita che sparisca proprio mentre entra in vista.
      const margin = rect.height;
      const offscreen =
        targetX < -margin ||
        targetY < -margin ||
        targetX > canvasBox.width + margin ||
        targetY > canvasBox.height + margin;

      if (offscreen) {
        if (obj.visible !== false) obj.visible = false;
        continue;
      }
      if (obj.visible === false) obj.visible = true;

      let anchorObj = anchorObjRef.current.get(slug);
      if (anchorObj === undefined) {
        anchorObj = findAnchorObject(obj, slug);
        anchorObjRef.current.set(slug, anchorObj);
      }
      // Letta dalle matrici solo la prima volta; poi la manteniamo noi.
      let anchor = anchorStateRef.current.get(slug) ?? anchorWorld(obj, anchorObj);
      anchor = scaleGroup(obj, anchor, slug, baselineRef.current, scales?.[slug] ?? 1);

      const converged = anchorStateRef.current.has(slug) && !forced;
      const result = centerOnPx(
        obj, anchorObj, projector, targetX, targetY, anchor,
        converged ? 1 : 2,
        jacobianRef.current.get(slug),
        (j) => jacobianRef.current.set(slug, j)
      );
      if (!result.anchor) {
        console.warn(`[spline] "${name}" non centrato: ${result.error}`);
        continue;
      }
      anchorStateRef.current.set(slug, result.anchor);
      placed += 1;
    }

    // Rivelazione dopo due frame: il primo lascia all'engine il tempo di
    // ridisegnare con le posizioni nuove, il secondo garantisce che quel
    // fotogramma sia già a schermo. Rivelare subito rimetterebbe in scena
    // proprio il fotogramma sbagliato che stiamo cercando di nascondere.
    if (placed > 0 && !positionedRef.current) {
      positionedRef.current = true;
      requestAnimationFrame(() => requestAnimationFrame(() => setPositioned(true)));
    }
  }, [groups, scales]);

  // Un ritardo fisso non basta: uscire da fullscreen su macOS è un'animazione
  // lunga mezzo secondo, durante la quale `resize` non si ripete e il canvas di
  // Spline si ridimensiona per conto suo. Qui si rimisura a ogni frame finché
  // contenitore e canvas non restano identici per qualche frame di fila.
  const settleRafRef = useRef(0);
  const lastGeometryRef = useRef("");

  // Inizio della raffica di assestamento in corso, e istante dell'ultima
  // richiesta. Il tetto si misura sulla raffica intera, non su un contatore
  // azzerato a ogni `scheduleSettle`: trascinando il bordo della finestra il
  // ResizeObserver richiama questa funzione a ogni fotogramma, e con un
  // contatore locale il tetto non veniva mai raggiunto — il ciclo girava per
  // tutta la durata del trascinamento, rimisurando sei box e attraversando
  // l'albero della scena a ogni giro.
  //
  // Una raffica e' una sequenza di richieste distanti meno di `BURST_GAP_MS`.
  // Un trascinamento e' quindi una sola raffica: si riposiziona per i primi due
  // secondi, poi si smette finche' il trascinamento non finisce — e la pausa
  // che lo chiude apre la raffica successiva, che fa l'assestamento finale.
  const settleStartRef = useRef(0);
  const settleLastCallRef = useRef(0);

  const scheduleSettle = useCallback(() => {
    const STABLE_FRAMES = 3;
    // Iterazioni concesse dopo che la geometria si e' fermata.
    const RECONVERGE_FRAMES = 10;
    const MAX_SETTLE_MS = 2000; // tetto di sicurezza, non un'attesa
    const BURST_GAP_MS = 300;
    let stable = 0;

    const now = performance.now();
    const newBurst =
      settleStartRef.current === 0 || now - settleLastCallRef.current > BURST_GAP_MS;
    settleLastCallRef.current = now;
    if (newBurst) settleStartRef.current = now;
    // Raffica gia' esaurita: si aspetta che finisca, non si riparte da capo.
    else if (now - settleStartRef.current >= MAX_SETTLE_MS) return;

    const geometry = () => {
      const box = containerRef.current?.getBoundingClientRect();
      const canvas = viewerRef.current?.shadowRoot?.querySelector("canvas");
      if (!box || !canvas) return "";
      return `${box.width}x${box.height}@${box.left},${box.top}|${canvas.clientWidth}x${canvas.clientHeight}`;
    };

    const tick = () => {
      const key = geometry();
      if (key && key === lastGeometryRef.current) {
        stable += 1;
      } else {
        stable = 0;
        lastGeometryRef.current = key;
        // Geometria cambiata: il solutore riparte e va lasciato chiudere.
        reconvergeRef.current = RECONVERGE_FRAMES;
        onNeedsMeasure?.();
        applyLayout();
      }
      // Bersaglio fermo ma posizioni non chiuse: si itera senza rimisurare.
      if (stable >= STABLE_FRAMES && reconvergeRef.current > 0) applyLayout();
      if (stable >= STABLE_FRAMES && reconvergeRef.current === 0) {
        // Assestato: la prossima richiesta apre una raffica nuova.
        settleStartRef.current = 0;
        return;
      }
      if (performance.now() - settleStartRef.current < MAX_SETTLE_MS) {
        settleRafRef.current = requestAnimationFrame(tick);
      }
      // Oltre il tetto si lascia `settleStartRef` com'e': segna che questa
      // raffica e' esaurita, e le richieste che arrivano ancora dentro di essa
      // non devono farla ripartire.
    };

    cancelAnimationFrame(settleRafRef.current);
    settleRafRef.current = requestAnimationFrame(tick);
  }, [applyLayout, onNeedsMeasure]);

  useEffect(() => () => cancelAnimationFrame(settleRafRef.current), []);

  // Vero quando lo stage è in vista e la scheda è attiva. Scritto dall'effetto
  // di sospensione più sotto, letto qui: un ref e non uno stato, perché deve
  // essere leggibile dentro un rAF loop senza rimontarlo a ogni cambio.
  const onScreenRef = useRef(true);

  // Canvas ancorato al viewport: box e canvas si muovono l'uno rispetto
  // all'altro a ogni pixel di scroll, quindi il layout va rifatto in continuo.
  //
  // Non ascolta l'evento `scroll`: sui browser mobile arriva dopo che il
  // compositor ha già dipinto il nuovo offset, spesso accorpato al fotogramma
  // successivo — un giro di ritardo che si somma a quello del nostro stesso
  // rAF. Le etichette HTML, dipinte dal compositor senza passare da JS, non lo
  // pagano: è da lì che nasce lo scarto visibile. Campionare `getBoundingClientRect`
  // a ogni fotogramma invece di aspettare l'evento legge sempre l'offset che il
  // browser sta per disegnare, non quello di cui ci ha già informati in ritardo.
  useEffect(() => {
    if (!followScroll || !sceneReady) return;

    let raf = 0;
    const tick = () => {
      if (onScreenRef.current && !document.hidden) {
        onNeedsMeasure?.();
        applyLayout();
        // Disegna subito, nello stesso frame in cui abbiamo spostato i gruppi:
        // senza, Spline dipinge al giro successivo del proprio ciclo e resta un
        // fotogramma più indietro delle etichette, che lo scroll muove nel
        // compositore.
        viewerRef.current?._spline?.requestRender?.();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [followScroll, sceneReady, applyLayout, onNeedsMeasure]);

  // Un contesto WebGL perso dipinge il canvas di nero opaco, in silenzio: senza
  // questo ascolto il sintomo è indistinguibile da una scena che non carica.
  // `preventDefault` sull'evento di perdita è ciò che rende possibile il
  // ripristino; senza, il browser non emette mai `webglcontextrestored`.
  useEffect(() => {
    const canvas = viewerRef.current?.shadowRoot?.querySelector("canvas");
    if (!canvas || !sceneReady) return;

    const onLost = (e: Event) => {
      e.preventDefault();
      console.error(`[spline] contesto WebGL perso — ${sceneUrl}`);
    };
    const onRestored = () => {
      console.warn("[spline] contesto WebGL ripristinato");
      scheduleSettle();
    };

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [sceneReady, sceneUrl, scheduleSettle]);

  // Sospensione del rendering quando la sezione non è in vista.
  //
  // Senza questo, ogni scena ridisegna a 60 fps per sempre — anche a pagina
  // scrollata altrove e a scheda in secondo piano — e con più scene sulla stessa
  // pagina il costo si somma. Su mobile è il grosso del problema.
  //
  // `_skipRender` è interno e non documentato: l'abbiamo trovato accanto a
  // `_requestRenderAutoMode`, che non fa altro che rimetterlo a false. Se una
  // versione futura di Spline lo rinomina, qui non succede nulla di male — si
  // torna semplicemente al comportamento di sempre.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sceneReady) return;

    const setPaused = (paused: boolean) => {
      const app = viewerRef.current?._spline;
      if (!app || !("_skipRender" in app)) return;
      app._skipRender = paused;
      // Alla ripresa serve un fotogramma subito, altrimenti in modalità "auto"
      // si resta sull'ultimo disegnato finché non cambia qualcosa.
      if (!paused) app.requestRender?.();
    };

    const sync = () => setPaused(!onScreenRef.current || document.hidden);

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreenRef.current = entry.isIntersecting;
        sync();
      },
      // Margine ampio: meglio riprendere un attimo prima che far comparire una
      // scena ferma sull'ultimo fotogramma.
      { rootMargin: "200px" }
    );
    observer.observe(container);
    document.addEventListener("visibilitychange", sync);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      onScreenRef.current = true;
      setPaused(false);
    };
  }, [sceneReady]);

  // La scena carica dopo il mount: qui chiediamo al genitore misure fresche e
  // riapplichiamo. `applyLayout` da solo non basterebbe — se i ref delle card
  // non fossero ancora arrivati, girerebbe su una lista vuota.
  // La scena è condivisa: ogni sezione ne mostra solo la propria parte. Va
  // fatto per istanza — ogni <spline-viewer> ha il suo grafo di oggetti, quindi
  // spegnerli qui non tocca le altre sezioni.
  useEffect(() => {
    if (!sceneReady || !hiddenGroups?.length) return;
    const app = viewerRef.current?._spline;
    if (typeof app?.findObjectByName !== "function") return;

    for (const name of hiddenGroups) {
      const obj = app.findObjectByName(name);
      if (obj) obj.visible = false;
      else console.warn(`[spline] gruppo da nascondere "${name}" non trovato`);
    }
  }, [sceneReady, hiddenGroups]);

  useEffect(() => {
    if (!sceneReady) return;
    scheduleSettle();
  }, [sceneReady, scheduleSettle]);

  // Lo stage è largo 100vw: al resize della finestra cambia davvero dimensione,
  // ed è il segnale più affidabile che il canvas di Spline si è già rifatto.
  // Un frame di attesa perché il ridimensionamento del canvas segue il layout.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sceneReady) return;

    const ro = new ResizeObserver(scheduleSettle);
    ro.observe(container);
    return () => ro.disconnect();
  }, [sceneReady, scheduleSettle]);

  // Intercetta il ridimensionamento interno del viewer. `_debouncedResize` e'
  // una proprieta' d'istanza costruita nel costruttore, quindi va sostituita
  // lei: rimpiazzare `_resize` non avrebbe effetto, il debounce ne ha gia'
  // catturato il riferimento.
  //
  // Nome interno, verificato sui viewer 1.12.98 e 2.0.43 (`SPLINE_VIEWER_SRC`).
  // Alzando quella versione va ricontrollato: se sparisce, il `typeof` sotto
  // non installa nulla e si torna a riallocare a ogni fotogramma del
  // trascinamento — nessun errore, ma il crash sulle GPU AMD ritorna.
  useEffect(() => {
    const app = viewerRef.current?._spline;
    if (!sceneReady || typeof app?._debouncedResize !== "function") return;

    // L'originale di Spline, preso una volta per viewer: uno ripreso dal
    // parcheggio ha già addosso il nostro wrapper, e riavvolgerlo impilerebbe
    // un giro sopra l'altro.
    const raw = app.__rawDebouncedResize ?? app._debouncedResize;
    app.__rawDebouncedResize = raw;

    // Ogni sostituto deve tenere `.cancel`: `dispose()` chiama
    // `_debouncedResize.cancel()`, e senza lo smontaggio si interrompeva a metà,
    // prima di scollegare il ResizeObserver.
    const withCancel = (fn: () => void) =>
      Object.assign(fn, { cancel: () => raw.cancel?.() });

    // Protezione dallo zero, sempre attiva, anche a viewer parcheggiato.
    // Staccato dal DOM il canvas misura 0×0, il ResizeObserver di Spline scatta
    // e il renderer si ridimensiona a zero: WebGL lo tollerava in silenzio,
    // WebGPU (viewer 2.x) rifiuta il framebuffer con "Dimension X is zero". Al
    // rientro nel DOM l'observer scatta di nuovo con la misura vera.
    const guarded = withCancel(() => {
      if (canvasIsEmpty(app)) return;
      raw.call(app);
    });

    resumeResizeRef.current = guarded;
    app._debouncedResize = withCancel(() => {
      if (frozenRef.current) {
        pendingResizeRef.current = true;
        return;
      }
      guarded();
    });

    return () => {
      // Un resize già in coda scatterebbe fra un attimo, a viewer staccato.
      raw.cancel?.();
      // Resta la sola protezione dallo zero: serve proprio adesso, mentre il
      // viewer viene staccato e parcheggiato.
      app._debouncedResize = guarded;
      resumeResizeRef.current = null;
      pendingResizeRef.current = false;
    };
  }, [sceneReady]);

  // Finestra di congelamento: si apre al primo segnale di ridimensionamento e
  // si chiude quando il box sta fermo, non sul solo scadere del timer — il
  // riflusso che segue l'ultimo `resize` costerebbe una seconda riallocazione.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sceneReady) return;

    // Deve superare i 400ms di `useIsMobile`, altrimenti il congelamento si
    // scioglie prima del restacking delle card.
    const UNFREEZE_MS = 500;
    const STABLE_FRAMES = 3;

    let timer: ReturnType<typeof setTimeout>;
    let raf = 0;

    const release = () => {
      let stable = 0;
      let lastKey = "";
      const tick = () => {
        const box = container.getBoundingClientRect();
        const key = `${Math.round(box.width)}x${Math.round(box.height)}`;
        if (key === lastKey) stable += 1;
        else { stable = 0; lastKey = key; }

        if (stable < STABLE_FRAMES) {
          raf = requestAnimationFrame(tick);
          return;
        }

        frozenRef.current = false;
        if (pendingResizeRef.current) {
          pendingResizeRef.current = false;
          resumeResizeRef.current?.();
        }
        scheduleSettle();
      };
      raf = requestAnimationFrame(tick);
    };

    const arm = () => {
      frozenRef.current = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      timer = setTimeout(release, UNFREEZE_MS);
    };

    window.addEventListener("resize", arm);

    // Il contenitore cambia anche senza un `resize` di finestra: il ribaltamento
    // fra griglia e colonna arriva da un re-render, 400ms dopo la soglia. Solo a
    // scena rivelata: al primo dimensionamento non c'e' niente da proteggere.
    const ro = new ResizeObserver(() => {
      if (positionedRef.current) arm();
    });
    ro.observe(container);

    return () => {
      window.removeEventListener("resize", arm);
      ro.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      frozenRef.current = false;
    };
  }, [sceneReady, scheduleSettle]);

  // Mirato: emette solo sul trigger della skill in hover, e chiude solo
  // l'eventuale trigger precedente (mai gli altri 4/5 mai toccati) — la
  // versione precedente faceva emitEventReverse su TUTTI gli oggetti a ogni
  // cambio hover, causando un flash su tutte le altre card ogni volta.
  useImperativeHandle(ref, () => ({
    setHovered: (skillSlug: string | null) => {
      const app = viewerRef.current?._spline;
      if (!app || typeof app.emitEvent !== "function") return;

      const triggerName = skillSlug ? `${skillSlug}-trigger` : null;

      if (activeTriggerRef.current && activeTriggerRef.current !== triggerName) {
        try { app.emitEventReverse("mouseHover", activeTriggerRef.current); } catch { /* no such event */ }
      }
      if (triggerName) {
        try { app.emitEvent("mouseHover", triggerName); } catch { /* no such event */ }
      }
      activeTriggerRef.current = triggerName;
    },
    layoutSlots: (slots) => {
      slotsRef.current = slots;
      applyLayout();
    },
  }), [applyLayout]);


  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <SplinePlaceholder visible={!positioned} />
    </div>
  );
});

export default SplineStage;
