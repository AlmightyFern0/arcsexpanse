// Rigenera src/components/footer/footerArtworkData.ts dai componenti Figma.
//
// I due artwork del footer sono component set con due varianti (Default /
// Variant2) collegate da un'interazione ON_HOVER con transizione SMART_ANIMATE.
// Smart Animate interpola le stesse forme fra i due stati: qui estraiamo la
// geometria della variante idle e, per ogni forma, il delta verso lo stato di
// hover. In pagina la transizione la fa il browser con una `transition` CSS su
// `transform`, che e' esattamente cio' che Smart Animate fa in Figma.
//
// Uso:  node scripts/figma-footer-artwork.mjs
// Richiede FIGMA_TOKEN in .env.local (scope: File content read-only).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/components/footer/footerArtworkData.ts");

const FILE_KEY = "SW4lspbOi232BSXMbxOsBc";

// Le due coppie idle -> hover, lette dalle `interactions` degli instance nel
// frame footer (node 745:55). Se il designer rifa i componenti da zero questi
// id cambiano: si rileggono da /v1/files/<key>/nodes?ids=745:55.
const ARTWORKS = [
  { name: "EMAIL_ARTWORK", label: "Group 97 - contatto email", idle: "1110:233", hover: "1110:285" },
  { name: "FORM_ARTWORK",  label: "Livello_1 - contatto form", idle: "1110:378", hover: "1110:490" },
];

function readToken() {
  const env = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("FIGMA_TOKEN="));
  if (!line) throw new Error("FIGMA_TOKEN assente da .env.local");
  return line.slice("FIGMA_TOKEN=".length).trim().replace(/^["']|["']$/g, "");
}

// Raccoglie le forme in ordine di documento. Smart Animate appaia i layer per
// nome, ma qui si chiamano tutti "Vector": Figma ricade sull'ordine, quindi
// l'appaiamento per indice e' lo stesso che usa lui.
function collectShapes(node) {
  const origin = node.absoluteBoundingBox;
  const shapes = [];

  const walk = (n) => {
    if (n.type === "VECTOR") {
      const fills = n.fills ?? [];
      const visible = fills.some((f) => f.visible !== false);
      // Un rettangolo di appoggio ha il fill spento: in Figma non si vede, e
      // nemmeno qui deve vedersi.
      if (visible && n.fillGeometry?.length) {
        const bb = n.absoluteBoundingBox;
        shapes.push({
          d: n.fillGeometry.map((g) => g.path).join(" "),
          x: bb.x - origin.x,
          y: bb.y - origin.y,
          w: bb.width,
          h: bb.height,
        });
      }
    }
    (n.children ?? []).forEach(walk);
  };
  walk(node);
  return shapes;
}

const r3 = (n) => Math.round(n * 1000) / 1000;

async function fetchNodes(token, ids) {
  const url = `https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${ids.join(",")}&geometry=paths`;
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${await res.text()}`);
  return (await res.json()).nodes;
}

const token = readToken();
const nodes = await fetchNodes(token, ARTWORKS.flatMap((a) => [a.idle, a.hover]));

const blocks = ARTWORKS.map(({ name, label, idle, hover }) => {
  const idleDoc = nodes[idle]?.document;
  const hoverDoc = nodes[hover]?.document;
  if (!idleDoc || !hoverDoc) throw new Error(`Nodi ${idle}/${hover} non trovati`);

  const a = collectShapes(idleDoc);
  const b = collectShapes(hoverDoc);
  if (a.length !== b.length) {
    throw new Error(`${name}: le varianti hanno ${a.length} e ${b.length} forme, non appaiabili`);
  }

  // Il box del componente non e' sempre l'area disegnata: l'artwork email ha
  // `clipsContent: false` e la barra inferiore sborda di 14px sotto il bordo.
  // In Figma quel pezzo si vede (il render dell'API esce 182x195, non 182x181),
  // quindi il viewBox deve essere l'unione di cio' che si vede nei due stati,
  // altrimenti in pagina la barra viene tagliata. Dove invece il clip c'e' —
  // il form, da cui la freccia entra scorrendo da fuori bordo — il box del
  // componente e' esattamente l'area da mostrare, ed e' quello che serve.
  const clip = idleDoc.clipsContent === true;
  const box = idleDoc.absoluteBoundingBox;
  const view = clip
    ? { x: 0, y: 0, w: box.width, h: box.height }
    : (() => {
        const all = [...a, ...b];
        const x0 = Math.min(0, ...all.map((s) => s.x));
        const y0 = Math.min(0, ...all.map((s) => s.y));
        const x1 = Math.max(box.width, ...all.map((s) => s.x + s.w));
        const y1 = Math.max(box.height, ...all.map((s) => s.y + s.h));
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      })();

  const shapes = a.map((s, i) => {
    const t = b[i];
    const shape = { d: s.d, x: r3(s.x), y: r3(s.y), hx: r3(t.x), hy: r3(t.y) };
    // Le forme che cambiano dimensione: Smart Animate le scala, e scalarle e'
    // anche l'unico modo di restare su `transform` senza toccare il layout.
    if (Math.abs(t.w - s.w) > 0.01) shape.sx = r3(t.w / s.w);
    if (Math.abs(t.h - s.h) > 0.01) shape.sy = r3(t.h / s.h);
    return shape;
  });

  const moving = shapes.filter((s) => s.x !== s.hx || s.y !== s.hy || s.sx || s.sy).length;

  return `// ${label} — ${shapes.length} forme, ${moving} animate all'hover.
export const ${name}: FooterArtwork = {
  viewBox: "${r3(view.x)} ${r3(view.y)} ${r3(view.w)} ${r3(view.h)}",
  width: ${r3(view.w)},
  height: ${r3(view.h)},
  clip: ${clip},
  shapes: [
${shapes.map((s) => `    ${JSON.stringify(s)},`).join("\n")}
  ],
};`;
});

const header = `// GENERATO DA scripts/figma-footer-artwork.mjs — non modificare a mano.
// Sorgente: Figma file ${FILE_KEY}, component set "Group 97" e "Livello_1".

export type FooterArtworkShape = {
  d: string;
  /** Posizione a riposo, nello spazio del viewBox. */
  x: number;
  y: number;
  /** Posizione in hover. */
  hx: number;
  hy: number;
  /** Scala in hover; assente = 1. */
  sx?: number;
  sy?: number;
};

export type FooterArtwork = {
  /** Area disegnata, non il box del componente. */
  viewBox: string;
  width: number;
  height: number;
  /** \`clipsContent\` del componente Figma. */
  clip: boolean;
  shapes: FooterArtworkShape[];
};
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${header}\n${blocks.join("\n\n")}\n`, "utf8");
console.log(`scritto ${OUT}`);
