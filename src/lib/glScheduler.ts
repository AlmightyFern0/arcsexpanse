"use client";

// Creazione dei contesti WebGL, messa in fila.
//
// Il driver AMD dei Mac Intel cade quando liberazione e allocazione di memoria
// video si accavallano. Tornando alla home da una pagina progetto succede
// esattamente questo: il contesto dell'hero che se ne va viene rilasciato e
// nello stesso istante ne nascono due — quello dell'hero nuovo e quello della
// scena Spline delle skill. Se poco prima è cambiata la dimensione della
// finestra — passaggio a schermo intero — il driver sta già riallocando i
// framebuffer di tutti, e le tre cose si sommano.
//
// Qui le creazioni si distanziano fra loro, si tengono lontane dalle
// liberazioni appena avvenute e aspettano che la finestra stia ferma. Costa
// qualche centinaio di millisecondi, coperti dallo splash di navigazione.

/** Attesa dopo l'ultima liberazione di un contesto: il browser distrugge il
 * contesto in modo asincrono, e allocare mentre lo fa è il caso peggiore. */
const RELEASE_COOLDOWN_MS = 400;

/** Distanza fra due creazioni consecutive. */
const SPACING_MS = 250;

/** Fotogrammi con viewport immobile prima di allocare. */
const STABLE_FRAMES = 3;

/** Tetto di attesa: oltre questo si alloca comunque. Meglio un rischio che una
 * pagina che non disegna mai — per esempio in una scheda in secondo piano, dove
 * i fotogrammi non arrivano affatto. */
const MAX_WAIT_MS = 2000;

type Job = {
  create: () => void;
  cancelled: boolean;
};

const queue: Job[] = [];
let draining = false;
let lastReleaseAt = -Infinity;
let lastCreateAt = -Infinity;

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const viewportKey = (): string =>
  typeof window === "undefined"
    ? ""
    : `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`;

/** Da chiamare subito dopo aver perso un contesto — `forceContextLoss()` o
 * `WEBGL_lose_context`. Le creazioni successive aspettano il raffreddamento. */
export function noteGlRelease(): void {
  lastReleaseAt = now();
}

/** Accoda la creazione di un contesto WebGL. Torna una funzione che annulla la
 * richiesta: va chiamata nella cleanup, altrimenti un componente smontato
 * mentre era in coda si ritroverebbe a creare il contesto dopo. */
export function scheduleGlCreate(create: () => void): () => void {
  const job: Job = { create, cancelled: false };
  queue.push(job);
  if (!draining) drain();
  return () => {
    job.cancelled = true;
  };
}

function drain(): void {
  draining = true;

  // I lavori annullati si scartano senza aspettare il proprio turno.
  let job = queue.shift();
  while (job?.cancelled) job = queue.shift();

  if (!job) {
    draining = false;
    return;
  }

  const current = job;
  waitForSlot(() => {
    if (!current.cancelled) {
      lastCreateAt = now();
      try {
        current.create();
      } catch (error) {
        // Un lavoro che esplode non deve bloccare la coda per sempre.
        console.error("[gl] creazione del contesto fallita", error);
      }
    }
    drain();
  });
}

/** Chiama `run` appena la finestra sta ferma e nessun'altra operazione di
 * memoria video è appena avvenuta. */
function waitForSlot(run: () => void): void {
  const startedAt = now();
  let stable = 0;
  let lastKey = "";
  let raf = 0;

  const finish = () => {
    cancelAnimationFrame(raf);
    clearTimeout(forced);
    run();
  };

  const tick = () => {
    const key = viewportKey();
    if (key === lastKey) stable += 1;
    else {
      stable = 0;
      lastKey = key;
    }

    const t = now();
    const quiet =
      t - lastReleaseAt >= RELEASE_COOLDOWN_MS && t - lastCreateAt >= SPACING_MS;

    if ((stable >= STABLE_FRAMES && quiet) || t - startedAt >= MAX_WAIT_MS) {
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  // In una scheda nascosta i fotogrammi non arrivano: il tetto vale comunque.
  const forced = setTimeout(finish, MAX_WAIT_MS);
  raf = requestAnimationFrame(tick);
}
